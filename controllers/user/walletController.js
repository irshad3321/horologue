import * as walletService from '../../service/walletService.js';
import * as cartService from '../../service/cartService.js';
import * as wishlistService from '../../service/wishlistService.js';

// Show wallet page
export const showWallet = async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        
        const balance = await walletService.getWalletBalance(userId);
        const allTransactions = await walletService.getWalletTransactions(userId);
        
        // Calculate stats from all transactions
        let totalCredits = 0;
        let totalDebits = 0;
        
        allTransactions.forEach(txn => {
            if (txn.type === 'credit' || txn.type === 'refund') {
                totalCredits += txn.amount;
            } else if (txn.type === 'debit') {
                totalDebits += txn.amount;
            }
        });
        
        // Reverse to show latest first
        const reversedTransactions = allTransactions.reverse();
        
        // Pagination
        const totalTransactions = reversedTransactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        const skip = (page - 1) * limit;
        const paginatedTransactions = reversedTransactions.slice(skip, skip + limit);
        
        // Get cart and wishlist counts
        const cartCount = await cartService.getCartCount(userId);
        const wishlistCount = await wishlistService.getWishlistCount(userId);
        
        res.render('user/wallet', {
            user: req.session.user,
            balance: balance,
            transactions: paginatedTransactions,
            totalCredits: totalCredits,
            totalDebits: totalDebits,
            cartCount: cartCount,
            wishlistCount: wishlistCount,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        });
    } catch (error) {
        console.error('Show wallet error:', error);
        res.status(500).render('error/500');
    }
};

// Add money to wallet (API)
export const addMoney = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { amount } = req.body;
        
        if (!amount || amount < 100) {
            return res.json({
                success: false,
                message: 'Minimum amount is ₹100'
            });
        }
        
        if (amount > 50000) {
            return res.json({
                success: false,
                message: 'Maximum amount is ₹50,000'
            });
        }
        
        await walletService.addMoneyToWallet(userId, parseFloat(amount), 'Money added to wallet');
        
        res.json({
            success: true,
            message: 'Money added successfully'
        });
    } catch (error) {
        console.error('Add money error:', error);
        res.json({
            success: false,
            message: 'Failed to add money'
        });
    }
};

// Get wallet balance (API)
export const getBalance = async (req, res) => {
    try {
        const userId = req.session.userId;
        const balance = await walletService.getWalletBalance(userId);
        
        res.json({
            success: true,
            balance: balance
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.json({
            success: false,
            message: 'Failed to get balance'
        });
    }
};
