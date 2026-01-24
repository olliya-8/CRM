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

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters!");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user && !data.session) {
        setSuccess(
          "Sign up successful! Please check your email to confirm your account."
        );
        setLoading(false);
        setTimeout(() => router.push("/login"), 3000);
        return;
      }

      if (data.user && data.session) {
        setUser({
          id: data.user.id,
          name: name || data.user.email?.split("@")[0] || "User",
          email: data.user.email || "",
          role: "user",
        });

        setSuccess("Account created successfully! Redirecting...");
        setTimeout(() => router.push("/user"), 1500);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F9FD] lg:px-10 lg:py-5">
      {/* LEFT SIDEBAR */}
      <div className="hidden lg:flex lg:w-1/2 rounded-l-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-8 lg:px-[94px] lg:py-[60px]">
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Image src={BGV} alt="Logo" width={36} height={36} />
            </div>
            <span className="text-2xl font-bold text-white">
              BlueGrid Ventures
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-12">
            Get started
          </h1>

          <div className="space-y-6">
            {["Create your account", "Verify your email", "Complete your profile"].map(
              (text, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      currentStep >= i + 1
                        ? "bg-white text-blue-500"
                        : "bg-blue-400 text-white"
                    }`}
                  >
                    {currentStep > i + 1 ? "✓" : i + 1}
                  </div>
                  <span
                    className={`font-semibold ${
                      currentStep >= i + 1 ? "text-white" : "text-blue-200"
                    }`}
                  >
                    {text}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 flex flex-col items-center bg-white lg:rounded-r-2xl p-4 md:p-4 overflow-y-auto 
                pt-2 sm:pt-2 lg:pt-0 lg:justify-center">

        <div className="w-full max-w-md">
          {/* ✅ MOBILE LOGO FIXED */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8 pt-14">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white ring-1-white shadow-sm">
              <Image
                src={BGV}
                alt="BlueGrid Ventures Logo"
                width={32}
                height={32}
                priority
              />
            </div>
            <span className="text-xl font-bold text-gray-900">
              BlueGrid Ventures
            </span>
          </div>

          <h2 className="hidden sm:block text-2xl md:text-3xl font-bold text-gray-900 text-center lg:text-left mb-8">
            Create your account
          </h2>

          <form onSubmit={handleSignUp} className="space-y-5">
            {[
              {
                label: "Full Name",
                type: "text",
                value: name,
                setValue: setName,
                placeholder: "John Doe",
              },
              {
                label: "Email Address",
                type: "email",
                value: email,
                setValue: setEmail,
                placeholder: "name@example.com",
              },
            ].map((field, i) => (
              <div key={i}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={field.value}
                  onChange={(e) => field.setValue(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  disabled={loading}
                />
              </div>
            ))}

            {/* PASSWORD */}
            {[{
              label: "Password",
              value: password,
              setValue: setPassword,
              show: showPassword,
              setShow: setShowPassword,
            },
            {
              label: "Confirm Password",
              value: confirmPassword,
              setValue: setConfirmPassword,
              show: showConfirmPassword,
              setShow: setShowConfirmPassword,
            }].map((p, i) => (
              <div key={i}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {p.label}
                </label>
                <div className="relative">
                  <input
                    type={p.show ? "text" : "password"}
                    value={p.value}
                    onChange={(e) => p.setValue(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg pr-12 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => p.setShow(!p.show)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {p.show ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            ))}

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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold transition disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Next Step →"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 font-bold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
