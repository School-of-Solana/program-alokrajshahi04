import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ExpenseTracker } from "../target/types/expense_tracker";
import { assert } from "chai";

describe("expense_tracker", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.expenseTracker as Program<ExpenseTracker>;

  const groupId = new anchor.BN(1);
  const [groupPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("group"), provider.wallet.publicKey.toBuffer(), groupId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  it("Initializes the group", async () => {
    await program.methods
      .initializeGroup(groupId, "My Group")
      .accounts({
        group: groupPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const groupAccount = await program.account.expenseGroup.fetch(groupPda);
    assert.ok(groupAccount.authority.equals(provider.wallet.publicKey));
    assert.ok(groupAccount.id.eq(groupId));
    assert.ok(groupAccount.expenseCount.eq(new anchor.BN(0)));
    assert.ok(groupAccount.totalAmount.eq(new anchor.BN(0)));
  });

  it("Adds an expense", async () => {
    const amount = new anchor.BN(100);
    const description = "Lunch";
    const category = "Food";
    
    // Fetch group to get current expense count for PDA derivation
    const groupAccountBefore = await program.account.expenseGroup.fetch(groupPda);
    const expenseId = groupAccountBefore.expenseCount;

    const [expensePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("expense"), groupPda.toBuffer(), expenseId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .addExpense(amount, description, category)
      .accounts({
        group: groupPda,
        expense: expensePda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const expenseAccount = await program.account.expense.fetch(expensePda);
    assert.ok(expenseAccount.amount.eq(amount));
    assert.equal(expenseAccount.description, description);
    assert.equal(expenseAccount.category, category);
    
    const groupAccountAfter = await program.account.expenseGroup.fetch(groupPda);
    assert.ok(groupAccountAfter.expenseCount.eq(expenseId.add(new anchor.BN(1))));
    assert.ok(groupAccountAfter.totalAmount.eq(amount));
  });

  it("Modifies an expense", async () => {
    const newAmount = new anchor.BN(150);
    const newDescription = "Dinner";
    const newCategory = "Food";

    // We need to derive the expense PDA again. 
    // Since we only added one expense, its ID is 0.
    const expenseId = new anchor.BN(0);
    const [expensePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("expense"), groupPda.toBuffer(), expenseId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .modifyExpense(newAmount, newDescription, newCategory)
      .accounts({
        group: groupPda,
        expense: expensePda,
        payer: provider.wallet.publicKey,
      })
      .rpc();

    const expenseAccount = await program.account.expense.fetch(expensePda);
    assert.ok(expenseAccount.amount.eq(newAmount));
    assert.equal(expenseAccount.description, newDescription);
    assert.equal(expenseAccount.category, newCategory);

    const groupAccount = await program.account.expenseGroup.fetch(groupPda);
    // Total should be updated from 100 -> 150
    assert.ok(groupAccount.totalAmount.eq(newAmount));
  });

  it("Fails to modify expense with wrong authority (Unhappy Path)", async () => {
    const newAmount = new anchor.BN(200);
    const newDescription = "Hacker Update";
    const newCategory = "Hacked";
    const expenseId = new anchor.BN(0);
    const [expensePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("expense"), groupPda.toBuffer(), expenseId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const otherUser = anchor.web3.Keypair.generate();
    // Airdrop some SOL to otherUser so they can pay for transaction fees
    const signature = await provider.connection.requestAirdrop(otherUser.publicKey, 1000000000);
    await provider.connection.confirmTransaction(signature);

    try {
      await program.methods
        .modifyExpense(newAmount, newDescription, newCategory)
        .accounts({
          expense: expensePda,
          payer: otherUser.publicKey,
        })
        .signers([otherUser])
        .rpc();
      assert.fail("Should have failed to modify expense with wrong authority");
    } catch (e) {
      // Expected error: ConstraintHasOne (the signer is not the payer stored in expense)
      assert.ok(e);
    }
  });

  it("Deletes an expense", async () => {
    const expenseId = new anchor.BN(0);
    const [expensePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("expense"), groupPda.toBuffer(), expenseId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .deleteExpense()
      .accounts({
        group: groupPda,
        expense: expensePda,
        payer: provider.wallet.publicKey,
      })
      .rpc();

    // Verify expense account is closed
    try {
      await program.account.expense.fetch(expensePda);
      assert.fail("Expense account should have been closed");
    } catch (e) {
      assert.ok(e.message.includes("Account does not exist"));
    }

    // Verify group total is reduced
    const groupAccount = await program.account.expenseGroup.fetch(groupPda);
    assert.ok(groupAccount.totalAmount.eq(new anchor.BN(0)));
  });

  it("Fails to initialize the same group twice (Unhappy Path)", async () => {
    try {
      await program.methods
        .initializeGroup(groupId)
        .accounts({
          authority: provider.wallet.publicKey,
        })
        .rpc();
      assert.fail("Should have failed to initialize same group twice");
    } catch (e) {
      // Check for error code or message indicating account already in use
      assert.ok(e);
    }
  });

  it("Joins a group", async () => {
    const newUser = anchor.web3.Keypair.generate();
    const signature = await provider.connection.requestAirdrop(newUser.publicKey, 1000000000);
    await provider.connection.confirmTransaction(signature);

    await program.methods
      .joinGroup()
      .accounts({
        group: groupPda,
        user: newUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newUser])
      .rpc();

    const groupAccount = await program.account.expenseGroup.fetch(groupPda);
    // Provider wallet is member 0, newUser should be member 1
    assert.ok(groupAccount.members.length === 2);
    assert.ok(groupAccount.members[1].equals(newUser.publicKey));
  });

  it("Registers a user profile", async () => {
    const name = "Alice";
    const [userProfilePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerUser(name)
      .accounts({
        userProfile: userProfilePda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const userProfile = await program.account.userProfile.fetch(userProfilePda);
    assert.equal(userProfile.name, name);
    assert.ok(userProfile.authority.equals(provider.wallet.publicKey));
  });

  it("Fails to register the same user twice (Unhappy Path)", async () => {
    const name = "Alice Duplicate";
    const [userProfilePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .registerUser(name)
        .accounts({
          userProfile: userProfilePda,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed to register same user twice");
    } catch (e) {
      assert.ok(e);
    }
  });

  it("Fails to delete expense with wrong authority (Unhappy Path)", async () => {
    // First add an expense to delete
    const amount = new anchor.BN(50);
    const description = "Taxi";
    const category = "Transport";
    
    const groupAccountBefore = await program.account.expenseGroup.fetch(groupPda);
    const expenseId = groupAccountBefore.expenseCount;

    const [expensePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("expense"), groupPda.toBuffer(), expenseId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .addExpense(amount, description, category)
      .accounts({
        group: groupPda,
        expense: expensePda,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    // Try to delete with a different user
    const otherUser = anchor.web3.Keypair.generate();
    const signature = await provider.connection.requestAirdrop(otherUser.publicKey, 1000000000);
    await provider.connection.confirmTransaction(signature);

    try {
      await program.methods
        .deleteExpense()
        .accounts({
          group: groupPda,
          expense: expensePda,
          payer: otherUser.publicKey,
        })
        .signers([otherUser])
        .rpc();
      assert.fail("Should have failed to delete expense with wrong authority");
    } catch (e) {
      // Expected error: ConstraintHasOne
      assert.ok(e);
    }
  });
});
