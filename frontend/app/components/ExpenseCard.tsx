"use client";

import { FC, useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Edit2, Check, X } from "lucide-react";
import * as anchor from "@coral-xyz/anchor";

interface ExpenseCardProps {
  expense: any;
  onModify: (id: number, amount: number, description: string) => void;
  onDelete: (id: number) => void;
  isOwner: boolean;
  payerName?: string;
  usdPrice?: number;
}

export const ExpenseCard: FC<ExpenseCardProps> = ({
  expense,
  onModify,
  onDelete,
  isOwner,
  payerName,
  usdPrice,
}) => {
  const amountInLamports = parseInt(expense.amount.toString());
  const amountInSol = amountInLamports / 1000000000;

  const [isEditing, setIsEditing] = useState(false);
  const [newAmount, setNewAmount] = useState(amountInSol.toString());
  const [newDescription, setNewDescription] = useState(expense.description);

  const handleSave = () => {
    const lamports = Math.floor(parseFloat(newAmount) * 1000000000);
    onModify(expense.id, lamports, newDescription);
    setIsEditing(false);
  };

  const usdValue = usdPrice ? (amountInSol * usdPrice).toFixed(2) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 shadow-lg hover:shadow-primary/20 transition-shadow"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700 focus:border-primary outline-none"
                placeholder="Description"
              />
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700 focus:border-primary outline-none"
                placeholder="Amount (SOL)"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{expense.description}</h3>
                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full border border-gray-700">
                  {expense.category || "Food"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-primary">
                  {amountInSol} SOL
                </p>
                {usdValue && (
                  <span className="text-sm text-gray-400">
                    (${usdValue})
                  </span>
                )}
              </div>
              <div className="flex gap-4 mt-2">
                <p className="text-xs text-gray-500 font-mono">
                  Paid by: {payerName || `${expense.payer.toString().slice(0, 4)}...${expense.payer.toString().slice(-4)}`}
                </p>
                {expense.timestamp && (
                  <p className="text-xs text-gray-500">
                    {new Date(expense.timestamp.toNumber() * 1000).toLocaleDateString()}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {isOwner && (
          <div className="flex gap-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/30 transition-colors"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-colors"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/30 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="p-2 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
