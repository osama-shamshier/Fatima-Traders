"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Store, Mail, Lock } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/loader";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl rounded-2xl p-8 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          
          <div className="flex flex-col items-center justify-center space-y-2 mb-8 text-white">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/95 p-1 shadow-xl flex items-center justify-center border border-white/30">
              <img 
                src="/logo.jpg" 
                alt="Fatima Traders" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mt-3 text-center">Fatima Traders</h1>
            <p className="text-blue-200 text-xs font-medium">Multi-Branch Store Management System</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-200 bg-red-900/50 border border-red-500/30 rounded-lg flex items-center justify-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-100" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-blue-300" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    disabled={isLoading}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-blue-100" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-blue-300" />
                  <input
                    id="password"
                    type="password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    disabled={isLoading}
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400 mt-1">{errors.password.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <ButtonSpinner />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-blue-200">
            <p>Secure login for authorized personnel only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
