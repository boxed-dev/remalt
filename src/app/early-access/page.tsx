"use client";
import React from "react";
import { motion } from "motion/react";
import Link from "next/link";

export default function EarlyAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
      <motion.div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-100"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 text-center">
          <h1 className="font-inter font-bold text-3xl md:text-4xl text-gray-900 mb-3">
            Get Early Access
          </h1>
          <p className="font-inter text-gray-600 text-base">
            Join the waitlist and be the first to know when we launch
          </p>
        </div>

        <form
          className="space-y-4"
          action="https://getlaunchlist.com/s/JZIFPd"
          method="post"
          target="_blank"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-inter"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="Enter your email"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-inter"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl font-inter"
          >
            Join Waitlist
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-inter"
          >
            ← Back to home
          </Link>
        </div>
      </motion.div>

      <script src="https://getlaunchlist.com/js/widget-diy.js" defer></script>
    </div>
  );
}
