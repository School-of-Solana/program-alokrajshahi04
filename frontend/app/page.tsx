"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Wallet, RefreshCw, Share2, Copy, Check, Users, Shield, Zap, ArrowRight } from "lucide-react";
import idl from "./idl/expense_tracker.json";
import { ExpenseCard } from "./components/ExpenseCard";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

const PROGRAM_ID = new anchor.web3.PublicKey("Bh5S4aNWemiwNhSCojw59A2gyhTDehqScB9eUm3aSun1");

function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900/50 border border-gray-800 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-gray-400">Live on Solana Devnet</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
            Tolti-Tracker <br />
            <span className="text-primary">On-Chain</span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The decentralized way to track shared costs with friends. 
            Create groups, invite members, and manage expenses transparently on Solana.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <WalletMultiButton className="!bg-primary hover:!bg-fuchsia-600 !h-14 !px-8 !rounded-xl !text-lg !font-bold transition-all hover:scale-105" />
            <button 
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-14 px-8 rounded-xl border border-gray-700 hover:bg-gray-900 text-white font-semibold transition-all flex items-center gap-2"
            >
              Learn More <ArrowRight size={20} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-gray-900/30">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Users className="text-blue-400" size={32} />,
              title: "Group Management",
              desc: "Create unlimited groups for trips, projects, or roommates. Invite friends with a simple link."
            },
            {
              icon: <Shield className="text-purple-400" size={32} />,
              title: "Secure & Transparent",
              desc: "All expenses are recorded on the Solana blockchain. No one can tamper with the history."
            },
            {
              icon: <Zap className="text-yellow-400" size={32} />,
              title: "Instant Updates",
              desc: "Real-time updates as members add or modify expenses. Always know where the money went."
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-gray-900/50 border border-gray-800 hover:border-primary/50 transition-colors"
            >
              <div className="mb-6 p-4 rounded-2xl bg-gray-800/50 w-fit">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">How it Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-gray-800 via-primary/50 to-gray-800 -translate-y-1/2 z-0" />
            
            {[
              { step: "1", title: "Connect", desc: "Link your Solana wallet" },
              { step: "2", title: "Create", desc: "Start a new expense group" },
              { step: "3", title: "Share", desc: "Send invite link to friends" },
              { step: "4", title: "Track", desc: "Add expenses & settle up" }
            ].map((item, i) => (
              <div key={i} className="relative z-10 bg-black p-4">
                <div className="w-12 h-12 mx-auto bg-gray-900 border border-gray-700 rounded-full flex items-center justify-center font-bold text-xl mb-4 text-primary shadow-lg shadow-primary/20">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ExpenseTrackerContent() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [program, setProgram] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [balance, setBalance] = useState(0);
  const [groupName, setGroupName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [copied, setCopied] = useState(false);
  const [userName, setUserName] = useState("");
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Determine which group to look at
  const urlCreator = searchParams.get("creator");
  const urlGroupId = searchParams.get("id");

  // Initialize Program
  useEffect(() => {
    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {});
      const program = new Program(idl as Idl, provider);
      setProgram(program);
    }
  }, [connection, wallet]);

  // Fetch Data
  const fetchData = async () => {
    if (!program || !wallet) return;
    setLoading(true);
    try {
      let targetCreator = wallet.publicKey;
      let targetGroupId = new anchor.BN(1); // Default ID

      // If URL params exist, use them
      if (urlCreator && urlGroupId) {
        try {
          targetCreator = new anchor.web3.PublicKey(urlCreator);
          targetGroupId = new anchor.BN(urlGroupId);
        } catch (e) {
          console.error("Invalid URL params");
        }
      }

      const [groupPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("group"), targetCreator.toBuffer(), targetGroupId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      try {
        const groupAccount = await program.account.expenseGroup.fetch(groupPda);
        setGroup({
          ...groupAccount,
          publicKey: groupPda,
          creator: targetCreator,
          id: targetGroupId
        });

        const allExpenses = await program.account.expense.all([
          {
            memcmp: {
              offset: 8, // Discriminator
              bytes: groupPda.toBase58(),
            },
          },
        ]);
        
        const sortedExpenses = allExpenses.map((e: any) => ({
            ...e.account,
            publicKey: e.publicKey
        })).sort((a: any, b: any) => a.id.sub(b.id).toNumber());

        setExpenses(sortedExpenses);

      } catch (e) {
        console.log("Group not found");
        setGroup(null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [program, urlCreator, urlGroupId]);

  // Fetch SOL Price
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
      .then(res => res.json())
      .then(data => setSolPrice(data.solana.usd))
      .catch(err => console.error("Failed to fetch SOL price", err));
  }, []);

  // Fetch User Profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!program || expenses.length === 0) return;

      const uniquePayers = Array.from(new Set(expenses.map(e => e.payer.toString())));
      const profiles: Record<string, string> = {};

      await Promise.all(uniquePayers.map(async (payerStr) => {
        try {
          const payer = new anchor.web3.PublicKey(payerStr);
          const [profilePda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("user"), payer.toBuffer()],
            program.programId
          );
          const profile = await program.account.userProfile.fetch(profilePda);
          profiles[payerStr] = profile.name;
        } catch (e) {
          // Profile not found, ignore
        }
      }));

      setUserProfiles(prev => ({ ...prev, ...profiles }));
    };

    fetchProfiles();
  }, [program, expenses]);

  const registerUser = async () => {
    if (!program || !wallet || !userName) return;
    setIsRegistering(true);
    try {
      const [userProfilePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user"), wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .registerUser(userName)
        .accounts({
          userProfile: userProfilePda,
          authority: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      setUserProfiles(prev => ({ ...prev, [wallet.publicKey.toString()]: userName }));
      setUserName("");
    } catch (error) {
      console.error("Error registering user:", error);
    } finally {
      setIsRegistering(false);
    }
  };

  const initializeGroup = async () => {
    if (!program || !wallet) return;
    try {
      // Generate a random ID to avoid collisions
      const newGroupId = new anchor.BN(Date.now());
      
      const [groupPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("group"), wallet.publicKey.toBuffer(), newGroupId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      await program.methods
        .initializeGroup(newGroupId, newGroupName || "My Group")
        .accounts({
          group: groupPda,
          authority: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      // Update URL to point to the new group
      router.push(`/?creator=${wallet.publicKey.toString()}&id=${newGroupId.toString()}`);
    } catch (error) {
      console.error("Error initializing group:", error);
    }
  };

  const joinGroup = async () => {
    if (!program || !wallet || !group) return;
    try {
      await program.methods
        .joinGroup()
        .accounts({
          group: group.publicKey,
          user: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      await fetchData();
    } catch (error) {
      console.error("Error joining group:", error);
    }
  };

  const addExpense = async () => {
    if (!program || !wallet || !group) return;
    try {
      // We use the group PDA we already fetched
      const groupPda = group.publicKey;
      const expenseId = group.expenseCount;

      const [expensePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("expense"), groupPda.toBuffer(), expenseId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const lamports = new anchor.BN(Math.floor(parseFloat(amount) * anchor.web3.LAMPORTS_PER_SOL));

      await program.methods
        .addExpense(lamports, description, category)
        .accounts({
          group: groupPda,
          expense: expensePda,
          authority: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      setDescription("");
      setAmount("");
      setCategory("Food");
      await fetchData();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  const modifyExpense = async (id: number, newAmount: number, newDescription: string) => {
    if (!program || !wallet || !group) return;
    try {
      const groupPda = group.publicKey;
      const expenseId = new anchor.BN(id);
      const [expensePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("expense"), groupPda.toBuffer(), expenseId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const currentExpense = expenses.find(e => e.id.toNumber() === id);
      const currentCategory = currentExpense ? currentExpense.category : "Food";

      await program.methods
        .modifyExpense(new anchor.BN(newAmount), newDescription, currentCategory)
        .accounts({
          group: groupPda,
          expense: expensePda,
          payer: wallet.publicKey,
        })
        .rpc();

      await fetchData();
    } catch (error) {
      console.error("Error modifying expense:", error);
    }
  };

  const deleteExpense = async (id: number) => {
    if (!program || !wallet || !group) return;
    try {
      const groupPda = group.publicKey;
      const expenseId = new anchor.BN(id);
      const [expensePda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("expense"), groupPda.toBuffer(), expenseId.toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      await program.methods
        .deleteExpense()
        .accounts({
          group: groupPda,
          expense: expensePda,
          payer: wallet.publicKey,
        })
        .rpc();

      await fetchData();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const shareGroup = () => {
    if (!group) return;
    const url = `${window.location.origin}/?creator=${group.creator.toString()}&id=${group.id.toString()}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch Balance
  useEffect(() => {
    if (wallet && connection) {
      const getBalance = async () => {
        const bal = await connection.getBalance(wallet.publicKey);
        setBalance(bal / anchor.web3.LAMPORTS_PER_SOL);
      };
      getBalance();
      const interval = setInterval(getBalance, 5000);
      return () => clearInterval(interval);
    }
  }, [wallet, connection]);

  const requestAirdrop = async () => {
    if (!wallet || !connection) return;
    try {
      const signature = await connection.requestAirdrop(wallet.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, ...latestBlockhash });
      const bal = await connection.getBalance(wallet.publicKey);
      setBalance(bal / anchor.web3.LAMPORTS_PER_SOL);
    } catch (e) {
      console.error("Airdrop failed:", e);
    }
  };

  if (!wallet) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans selection:bg-primary selection:text-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Wallet className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Tolti-Tracker
            </h1>
          </motion.div>
          <div className="flex items-center gap-4">
            {wallet && (
              <div className="flex items-center gap-2 bg-gray-900/50 px-4 py-2 rounded-xl border border-gray-800">
                <span className="text-sm font-medium text-gray-400">Balance:</span>
                <span className="font-bold text-white">{balance.toFixed(2)} SOL</span>
                {balance < 2 && (
                  <button
                    onClick={requestAirdrop}
                    className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors"
                  >
                    Airdrop
                  </button>
                )}
              </div>
            )}
            <WalletMultiButton className="!bg-secondary hover:!bg-blue-600 transition-colors !rounded-xl" />
          </div>
        </header>

        {/* User Registration */}
        {wallet && !userProfiles[wallet.publicKey.toString()] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-8 bg-gray-900/50 border border-gray-800 p-4 rounded-xl flex items-center gap-4"
          >
            <div className="flex-1">
              <h3 className="font-semibold text-white">Set your Display Name</h3>
              <p className="text-sm text-gray-400">Register a name so your friends know who paid.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="bg-black border border-gray-700 rounded-lg px-3 py-2 focus:border-primary outline-none"
              />
              <button
                onClick={registerUser}
                disabled={!userName || isRegistering}
                className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-fuchsia-600 disabled:opacity-50 transition-colors"
              >
                {isRegistering ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {!group ? (
            <motion.div
              key="init"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-[60vh]"
            >
              <h2 className="text-2xl font-semibold mb-6">Create a New Group</h2>
              <div className="flex flex-col gap-4 w-full max-w-md">
                <input
                  type="text"
                  placeholder="Group Name (e.g. Trip to Goa)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 focus:border-primary outline-none text-center text-lg"
                />
                <button
                  onClick={initializeGroup}
                  disabled={!newGroupName}
                  className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-fuchsia-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Initialize New Group
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Group Info */}
              <div className="mb-8 flex justify-between items-end bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{group.name}</h2>
                  <div className="flex items-center gap-4 text-gray-400 text-sm">
                    <span className="flex items-center gap-1">
                      <Wallet size={14} />
                      {group.members.length} Members
                    </span>
                    {!group.members.find((m: any) => m.equals(wallet.publicKey)) && (
                      <button
                        onClick={joinGroup}
                        className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors text-xs font-semibold"
                      >
                        Join Group
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={shareGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium"
                >
                  {copied ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
                  {copied ? "Copied!" : "Share Invite"}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl backdrop-blur-sm">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Total Expenses</h3>
                  <p className="text-4xl font-bold text-white">
                    {(parseInt(group.totalAmount.toString()) / anchor.web3.LAMPORTS_PER_SOL).toFixed(2)} SOL
                  </p>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl backdrop-blur-sm">
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Expense Count</h3>
                  <p className="text-4xl font-bold text-white">{group.expenseCount.toString()}</p>
                </div>
              </div>

              {/* Add Expense Form */}
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-primary" />
                  Add New Expense
                </h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="text"
                    placeholder="Description (e.g. Dinner)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex-[2] bg-black border border-gray-700 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                  />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                  >
                    <option value="Food">Food</option>
                    <option value="Rent">Rent</option>
                    <option value="Tools">Tools</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Amount (SOL)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-32 bg-black border border-gray-700 rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                  />
                  <button
                    onClick={addExpense}
                    disabled={!description || !amount}
                    className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-fuchsia-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Expense List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Recent Expenses</h3>
                  <button 
                    onClick={fetchData}
                    className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
                
                <AnimatePresence>
                  {expenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id.toString()}
                      expense={expense}
                      onModify={modifyExpense}
                      onDelete={deleteExpense}
                      isOwner={expense.payer.equals(wallet.publicKey)}
                      payerName={userProfiles[expense.payer.toString()]}
                      usdPrice={solPrice || undefined}
                    />
                  ))}
                </AnimatePresence>
                
                {expenses.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No expenses yet. Add one above!
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <ExpenseTrackerContent />
    </Suspense>
  );
}
