"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import BGV from "@/assets/bgv.png";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/user-context";

export default function SignUpPage() {
  const router = useRouter();
  const { setUser } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters!");
      setLoading(false);
      return;
    }

    try {
      // Sign up with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setSuccess("Sign up successful! Please check your email to confirm your account.");
        setLoading(false);
        
        setTimeout(() => {
          router.push("/login");
        }, 3000);
        return;
      }

      // If sign up is successful and session is created
      if (data.user && data.session) {
        setUser({
          id: data.user.id,
          name: name || data.user.email?.split("@")[0] || "User",
          email: data.user.email || "",
          role: "user"
        });

        setSuccess("Account created successfully! Redirecting...");
        
        setTimeout(() => {
          router.push("/user");
        }, 1500);
      }
      
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F9FD] px-10 py-5">
      {/* LEFT SIDEBAR */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br rounded-l-2xl from-blue-500 to-blue-600 p-8 flex-col lg:px-[94px] lg:py-[60px]">
        <div className="flex-1 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Image
                src={BGV}
                alt="Logo"
                className="w-9 h-9"
              />
            </div>
            <span className="text-2xl font-bold text-white">BlueGrid Ventures</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-extrabold text-white mb-12">
            Get started
          </h1>

          {/* Steps */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 1 ? 'bg-white text-blue-500' : 'bg-blue-400 text-white'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className="text-white font-semibold">Create your account</span>
            </div>

            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 2 ? 'bg-white text-blue-500' : 'bg-blue-400 text-white'
              }`}>
                2
              </div>
              <span className={`font-semibold ${currentStep >= 2 ? 'text-white' : 'text-blue-200'}`}>
                Verify your email
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                currentStep >= 3 ? 'bg-white text-blue-500' : 'bg-blue-400 text-white'
              }`}>
                3
              </div>
              <span className={`font-semibold ${currentStep >= 3 ? 'text-white' : 'text-blue-200'}`}>
                Complete your profile
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="flex-1 flex items-center bg-white rounded-r-2xl justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Image
                src={BGV}
                alt="Logo"
                className="w-6 h-6"
              />
            </div>
            <span className="text-2xl font-bold text-gray-800">
              BlueGrid Ventures
            </span>
          </div>

          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Create your account
              </h2>
            </div>

            <form onSubmit={handleSignUp} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-12"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-12"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Creating account..." : "Next Step"}
                {!loading && <span>→</span>}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-blue-500 font-bold"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}