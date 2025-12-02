use anchor_lang::prelude::*;

const MAX_GROUP_MEMBERS: usize = 10;

declare_id!("Bh5S4aNWemiwNhSCojw59A2gyhTDehqScB9eUm3aSun1");

#[program]
pub mod expense_tracker {
    use super::*;

    pub fn register_user(ctx: Context<RegisterUser>, name: String) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.authority = ctx.accounts.authority.key();
        user_profile.name = name;
        Ok(())
    }

    pub fn initialize_group(
        ctx: Context<InitializeGroup>,
        group_id: u64,
        name: String,
    ) -> Result<()> {
        let group = &mut ctx.accounts.group;
        group.authority = ctx.accounts.authority.key();
        group.id = group_id;
        group.name = name;
        group.expense_count = 0;
        group.total_amount = 0;
        group.members = Vec::with_capacity(MAX_GROUP_MEMBERS);
        Ok(())
    }

    pub fn join_group(ctx: Context<JoinGroup>) -> Result<()> {
        let group = &mut ctx.accounts.group;
        let user_key = ctx.accounts.user.key();

        require!(
            !group.members.contains(&user_key),
            ExpenseTrackerError::UserAlreadyMember
        );
        require!(
            group.members.len() < MAX_GROUP_MEMBERS,
            ExpenseTrackerError::GroupMemberLimitReached
        );

        group.members.push(user_key);
        Ok(())
    }

    pub fn add_expense(
        ctx: Context<AddExpense>,
        amount: u64,
        description: String,
        category: String,
    ) -> Result<()> {
        let group = &mut ctx.accounts.group;
        let expense = &mut ctx.accounts.expense;
        let authority_key = ctx.accounts.authority.key();

        require!(
            group.authority == authority_key || group.members.contains(&authority_key),
            ExpenseTrackerError::UnauthorizedExpenseAction
        );

        expense.group = group.key();
        expense.id = group.expense_count;
        expense.amount = amount;
        expense.description = description;
        expense.category = category;
        expense.payer = authority_key;
        expense.timestamp = Clock::get()?.unix_timestamp;

        group.expense_count = group
            .expense_count
            .checked_add(1)
            .ok_or(ExpenseTrackerError::MathOverflow)?;
        group.total_amount = group
            .total_amount
            .checked_add(amount)
            .ok_or(ExpenseTrackerError::MathOverflow)?;
        Ok(())
    }

    pub fn modify_expense(
        ctx: Context<ModifyExpense>,
        new_amount: u64,
        new_description: String,
        new_category: String,
    ) -> Result<()> {
        let group = &mut ctx.accounts.group;
        let expense = &mut ctx.accounts.expense;

        group.total_amount = group
            .total_amount
            .checked_sub(expense.amount)
            .ok_or(ExpenseTrackerError::MathOverflow)?
            .checked_add(new_amount)
            .ok_or(ExpenseTrackerError::MathOverflow)?;

        expense.amount = new_amount;
        expense.description = new_description;
        expense.category = new_category;
        Ok(())
    }

    pub fn delete_expense(ctx: Context<DeleteExpense>) -> Result<()> {
        let group = &mut ctx.accounts.group;
        let expense = &ctx.accounts.expense;

        group.total_amount = group
            .total_amount
            .checked_sub(expense.amount)
            .ok_or(ExpenseTrackerError::MathOverflow)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + (4 + 64), // discriminator + pubkey + string
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(group_id: u64, name: String)]
pub struct InitializeGroup<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + (4 + 64) + 8 + 8 + (4 + 10 * 32), // approximate space
        seeds = [b"group", authority.key().as_ref(), &group_id.to_le_bytes()],
        bump
    )]
    pub group: Account<'info, ExpenseGroup>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGroup<'info> {
    #[account(mut)]
    pub group: Account<'info, ExpenseGroup>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddExpense<'info> {
    #[account(mut)]
    pub group: Account<'info, ExpenseGroup>,
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + (4 + 256) + (4 + 64) + 32 + 8, // space for Expense
        seeds = [b"expense", group.key().as_ref(), &group.expense_count.to_le_bytes()],
        bump
    )]
    pub expense: Account<'info, Expense>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModifyExpense<'info> {
    #[account(mut)]
    pub group: Account<'info, ExpenseGroup>,
    #[account(
        mut,
        has_one = group,
        has_one = payer
    )]
    pub expense: Account<'info, Expense>,
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeleteExpense<'info> {
    #[account(mut)]
    pub group: Account<'info, ExpenseGroup>,
    #[account(
        mut,
        close = payer,
        has_one = group,
        has_one = payer
    )]
    pub expense: Account<'info, Expense>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[account]
pub struct Expense {
    pub group: Pubkey,
    pub id: u64,
    pub amount: u64,
    pub description: String,
    pub category: String,
    pub payer: Pubkey,
    pub timestamp: i64,
}

#[account]
pub struct ExpenseGroup {
    pub authority: Pubkey,
    pub id: u64,
    pub name: String,
    pub expense_count: u64,
    pub total_amount: u64,
    pub members: Vec<Pubkey>,
}

#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub name: String,
}

#[error_code]
pub enum ExpenseTrackerError {
    #[msg("User is already a member of this group")]
    UserAlreadyMember,
    #[msg("Group member limit reached")]
    GroupMemberLimitReached,
    #[msg("Only group members or the authority can perform this action")]
    UnauthorizedExpenseAction,
    #[msg("Mathematical overflow detected")]
    MathOverflow,
}
