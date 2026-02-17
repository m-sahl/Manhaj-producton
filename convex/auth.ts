import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import bcrypt from "bcryptjs";

// Validation check: forcing update

export const isAdminInitialized = query({
    args: {},
    handler: async (ctx) => {
        const admins = await ctx.db.query("admins").collect();
        return admins.length > 0;
    },
});

export const getAdminName = query({
    args: {},
    handler: async (ctx) => {
        const admins = await ctx.db.query("admins").collect();
        if (admins.length === 0) return null;
        return admins[0].name || "Admin";
    },
});

export const initAdmin = mutation({
    args: {
        username: v.string(),
        password: v.string(),
        name: v.string()
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("admins").collect();
        if (existing.length > 0) return { success: false, message: "Admin already initialized" };

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(args.password, salt);

        await ctx.db.insert("admins", {
            passwordHash,
            name: args.name,
            username: args.username
        });
        return { success: true };
    },
});

export const verify = mutation({
    args: {
        username: v.string(),
        password: v.string()
    },
    handler: async (ctx, args) => {
        // Collect all admins (should be only one or few)
        const admins = await ctx.db.query("admins").collect();

        // 1. Try to find admin by specific username
        // Use manual iteration to avoid index dependency
        const adminWithUsername = admins.find(a => a.username === args.username);

        if (adminWithUsername) {
            const isValid = bcrypt.compareSync(args.password, adminWithUsername.passwordHash);
            if (isValid) {
                return { success: true, name: adminWithUsername.name || "Admin" };
            }
        }

        // 2. Migration: If username is 'admin', check if there's a legacy admin with NO username
        if (args.username === 'admin') {
            const legacyAdmin = admins.find(a => !a.username); // Find one without username

            if (legacyAdmin) {
                const isValid = bcrypt.compareSync(args.password, legacyAdmin.passwordHash);
                if (isValid) {
                    // Auto-migrate: Set their username to 'admin'
                    await ctx.db.patch(legacyAdmin._id, { username: 'admin' });
                    return { success: true, name: legacyAdmin.name || "Admin", message: "Account migrated to 'admin'" };
                }
            }
        }

        return { success: false, message: "Invalid username or password" };
    },
});

export const updatePassword = mutation({
    args: {
        currentPassword: v.string(),
        newPassword: v.string()
    },
    handler: async (ctx, args) => {
        const admins = await ctx.db.query("admins").collect();
        if (admins.length === 0) return { success: false, message: "Admin not found" };

        const admin = admins[0];
        const isValid = bcrypt.compareSync(args.currentPassword, admin.passwordHash);
        if (!isValid) return { success: false, message: "Incorrect current password" };

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(args.newPassword, salt);

        await ctx.db.patch(admin._id, { passwordHash });
        return { success: true };
    },
});

export const updateName = mutation({
    args: {
        name: v.string()
    },
    handler: async (ctx, args) => {
        const admins = await ctx.db.query("admins").collect();
        if (admins.length === 0) return { success: false, message: "Admin not found" };

        const admin = admins[0];
        await ctx.db.patch(admin._id, { name: args.name });
        return { success: true };
    },
});

export const updateUsername = mutation({
    args: {
        username: v.string()
    },
    handler: async (ctx, args) => {
        const admins = await ctx.db.query("admins").collect();
        if (admins.length === 0) return { success: false, message: "Admin not found" };

        const admin = admins[0];

        // Check uniqueness manually
        const existing = admins.find(a => a.username === args.username);

        if (existing && existing._id !== admin._id) {
            return { success: false, message: "Username already taken" };
        }

        await ctx.db.patch(admin._id, { username: args.username });
        return { success: true };
    },
});
