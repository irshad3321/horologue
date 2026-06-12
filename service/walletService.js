import User from '../models/User.js';

// Get wallet balance
export async function getWalletBalance(userId) {
    try {
        const user = await User.findById(userId).select('wallet');
        return user?.wallet?.balance || 0;
    } catch (error) {
        throw error;
    }
}

// Get wallet transactions
export async function getWalletTransactions(userId) {
    try {
        const user = await User.findById(userId).select('wallet').populate('wallet.transactions.orderId');
        return user?.wallet?.transactions || [];
    } catch (error) {
        throw error;
    }
}

// Add money to wallet
export async function addMoneyToWallet(userId, amount, description = 'Money added to wallet') {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }
        
        if (!user.wallet) {
            user.wallet = { balance: 0, transactions: [] };
        }
        
        user.wallet.balance += amount;
        user.wallet.transactions.push({
            type: 'credit',
            amount: amount,
            description: description,
            date: new Date()
        });
        
        await user.save();
        return user.wallet;
    } catch (error) {
        throw error;
    }
}

// Deduct money from wallet
export async function deductMoneyFromWallet(userId, amount, description, orderId = null) {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }
        
        if (!user.wallet || user.wallet.balance < amount) {
            throw new Error('Insufficient wallet balance');
        }
        
        user.wallet.balance -= amount;
        user.wallet.transactions.push({
            type: 'debit',
            amount: amount,
            description: description,
            orderId: orderId,
            date: new Date()
        });
        
        await user.save();
        return user.wallet;
    } catch (error) {
        throw error;
    }
}

// Refund money to wallet
export async function refundToWallet(userId, amount, description, orderId = null) {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }
        
        if (!user.wallet) {
            user.wallet = { balance: 0, transactions: [] };
        }
        
        user.wallet.balance += amount;
        user.wallet.transactions.push({
            type: 'refund',
            amount: amount,
            description: description,
            orderId: orderId,
            date: new Date()
        });
        
        await user.save();
        return user.wallet;
    } catch (error) {
        throw error;
    }
}

// Check if user has sufficient balance
export async function hasSufficientBalance(userId, amount) {
    try {
        const balance = await getWalletBalance(userId);
        return balance >= amount;
    } catch (error) {
        throw error;
    }
}
