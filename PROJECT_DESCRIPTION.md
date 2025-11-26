# Project Description

**Deployed Frontend URL:** https://tolti-tracker.vercel.app/

**Solana Program ID:** `Bh5S4aNWemiwNhSCojw59A2gyhTDehqScB9eUm3aSun1`

## Project Overview

### Description
**Tolti Tracker** is a decentralized application designed to simplify shared expense management. It allows users to create shared expense groups and track spending transparently on the Solana blockchain. Unlike traditional apps, all data is stored on-chain, ensuring immutability and trust. Users can create groups, add expenses with descriptions and amounts, and even modify or delete their own entries if mistakes are made.

### Key Features
- **Create Expense Groups**: Users can initialize a new shared expense group on-chain.
- **User Identity**: Users can register a display name that appears on their expenses instead of a wallet address.
- **Join Groups**: Users can join existing groups to become members.
- **Add Expenses**: Members can add expenses to the group, recording the amount, description, category, and payer.
- **Real-time Stats**: The dashboard automatically calculates and displays the total amount spent and the number of expenses in the group.
- **Modify Expenses**: Users can update the amount, description, or category of expenses they created.
- **Delete Expenses**: Users can remove their expenses, which automatically updates the group's total.
- **Secure Ownership**: Only the original payer can modify or delete their specific expense entries.

### How to Use the dApp
1. **Connect Wallet**: Click the "Select Wallet" button to connect your Phantom or Solflare wallet.
2. **Register Name**: Enter your display name in the dashboard to register your identity on-chain.
3. **Initialize Group**: If no group exists for the current ID, click "Initialize New Group" to create one.
4. **Join Group**: If viewing someone else's group, click "Join Group" to become a member.
5. **Add Expense**: Enter a description (e.g., "Dinner"), select a category, and enter amount (in SOL), then click "Add".
6. **View Expenses**: Scroll down to see the list of all expenses in the group.
7. **Edit/Delete**: Click the "Edit" (pencil) icon to modify an expense or the "Trash" icon to delete it. You can only edit/delete expenses you paid for.

## Program Architecture

### PDA Usage
The program uses Program Derived Addresses (PDAs) to deterministically locate accounts without storing their public keys centrally.

**PDAs Used:**
- **Expense Group PDA**: Stores the group's state (total amount, expense count).
    - Seeds: `b"group"`, `authority_pubkey`, `group_id (u64)`
- **Expense PDA**: Stores individual expense details.
    - Seeds: `b"expense"`, `group_pda`, `expense_id (u64)`
    - *Note*: `expense_id` is an auto-incrementing counter stored on the Group account.

### Program Instructions
- **`initialize_group`**: Creates a new `ExpenseGroup` account. Sets the authority and initializes counters to zero.
- **`join_group`**: Adds the caller to the group's member list if they are not already a member.
- **`register_user`**: Creates a `UserProfile` account for the caller, storing their display name.
- **`add_expense`**: Creates a new `Expense` account. Increments the group's `expense_count` and adds the amount to `total_amount`.
- **`modify_expense`**: Updates an existing `Expense` account. Adjusts the group's `total_amount` by subtracting the old amount and adding the new one. Enforces that `payer` matches the expense's original payer.
- **`delete_expense`**: Closes an `Expense` account and refunds the rent to the payer. Subtracts the expense amount from the group's `total_amount`.

### Account Structure

```rust
#[account]
pub struct ExpenseGroup {
    pub authority: Pubkey,   // The creator of the group
    pub id: u64,             // Unique ID for the group
    pub name: String,        // Name of the group
    pub expense_count: u64,  // Counter for generating Expense IDs
    pub total_amount: u64,   // Total SOL spent in the group
    pub members: Vec<Pubkey> // List of group members
}

#[account]
pub struct Expense {
    pub group: Pubkey,       // The group this expense belongs to
    pub id: u64,             // Unique ID within the group
    pub amount: u64,         // Cost in Lamports/SOL
    pub description: String, // Description (max 50 chars)
    pub category: String,    // Category (e.g., Food, Rent)
    pub payer: Pubkey,       // The user who paid for this expense
    pub timestamp: i64,      // Unix timestamp of creation
}

#[account]
pub struct UserProfile {
    pub authority: Pubkey,   // The user's wallet address
    pub name: String,        // The user's display name
}
```

## Testing

### Test Coverage
The project includes a comprehensive TypeScript test suite using Anchor.

**Happy Path Tests:**
- **Initializes the group**: Verifies that a group is created with correct initial values (0 total, 0 count).
- **Joins a group**: Verifies that a new user can join an existing group and is added to the members list.
- **Registers a user profile**: Checks if a user can register a display name and if the PDA is correctly derived.
- **Adds an expense**: Checks if an expense is correctly saved and if the group's total updates.
- **Modifies an expense**: Ensures that changing an amount updates both the expense record and the group's total correctly.
- **Deletes an expense**: Verifies that the expense account is closed and the amount is subtracted from the group total.

**Unhappy Path Tests:**
- **Fails to initialize same group twice**: Ensures that PDAs prevent duplicate group creation.
- **Fails to register same user twice**: Ensures that a user cannot overwrite their profile accidentally (init constraint).
- **Fails to modify expense with wrong authority**: Confirms that a user cannot edit an expense they didn't pay for (security check).
- **Fails to delete expense with wrong authority**: Confirms that a user cannot delete an expense they didn't pay for.

### Running Tests
```bash
cd anchor_project
anchor test
```
### Additional Notes for Evaluators
- I wanted to participate in the colosseum hackathon , but when I tried to build the project -Gumroad for web3 , I realized that I did not understand rust or solana much , So then  only I decided to take part in ackee , Now that I am submitting this project , I feel that I have learned a lot about solana and rust programming . And I know what tools are required to build a project , how to use anchor framework , how to use pda and how to write test cases . I hope to learn more and more about solana and rust in the future and build more projects on solana . Thank you ackee team for giving me this opportunity .
Maybe I might not join Turbine program but I will definitely go ahead and Build my idea's on solana . Thank you once again .