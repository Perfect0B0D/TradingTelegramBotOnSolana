const User = require('../schema/userSchema');

// Function to get all user data
const getAllUsers = async () => {
    try {
        const users = await User.find({});
        return users;
    } catch (error) {
        throw error;
    }
};

// Function to get all user data
const getUserData = async (userId) => {
    try {
        const Users = await User.findOne({ userId });
        return Users;
    } catch (error) {
        throw error;
    }
};

// Function to create a new user
const createUser = async (userData) => {
    try {
        const newUser = new User(userData);
        const savedUser = await newUser.save();
        return savedUser;
    } catch (error) {
        throw error;
    }
};

// Function to update notification state for a user
const updateWallet = async (userId, walletData) => {
    try {
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            { $set: { wallet: walletData } },
            { new: true }
        );
        return updatedUser;
    } catch (error) {
        throw error;
    }
};

// Function to update settings for a user
const updateSettings = async (userId, settingsData) => {
    try {
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            { $set: { settings: settingsData } },
            { new: true }
        );
        return updatedUser;
    } catch (error) {
        console.error(`Error updating settings for userId ${userId}:`, error);
        throw error;
    }
};

// Function to check if a user exists by userId
const checkUserExists = async (userId) => {
    try {
        const user = await User.findOne({ userId });
        return !!user; // Returns true if user exists, false otherwise
    } catch (error) {
        throw error;
    }
};

const removeUser = async (userId) => {
    const deletedUser = await User.deleteOne({ userId: userId });
    if(deletedUser.deletedCount === 1) {
        console.log("The user was deleted")
    } else {
        console.log("The user was not found");
    }
    return;
}

module.exports = {
    getAllUsers,
    createUser,
    getUserData,
    checkUserExists,
    removeUser,
    updateWallet,
    updateSettings
};
