"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { setToken } from "@/lib/token";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export const FormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must not exceed 50 characters")
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(64, "Password must not exceed 64 characters")
    .regex(/[a-z]/, "Password must include at least one lowercase letter")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[0-9]/, "Password must include at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must include at least one special character"
    ),
});

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: "admin123", password: "Admin@123" },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}api/auth/login`,
        data
      );

      if (response.status !== 200) {
        setError("Invalid name or password");
        toast.error("Invalid name or password", { duration: 2000 });
        return;
      }

      const token = response.data?.token;
      if (!token) {
        setError("Invalid name or password");
        toast.error("Invalid name or password", { duration: 2000 });
        return;
      }

      setToken(token, "authToken");
      toast.success("Login successful", { duration: 2000 });
      router.replace("/");
    } catch (err) {
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <h2 className="text-xl font-semibold text-center">
          Enter your username below to login to your account
        </h2>
        {error && (
          <div className="text-sm text-destructive text-center">{error}</div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Your username" {...field} />
              </FormControl>
              <FormMessage className="text-sm text-destructive">
                {fieldState.error?.message}
              </FormMessage>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    {...field}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <Eye className="size-5" />
                    ) : (
                      <EyeOff className="size-5" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage className="text-sm text-destructive">
                {fieldState.error?.message}
              </FormMessage>
            </FormItem>
          )}
        />
        <div
          role="status"
          aria-live="polite"
          className="text-center text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-md"
        >
          {isLoading
            ? "First request takes a little bit of time — hold on..."
            : "Click to login directly (demo credentials prefilled)"}
        </div>
        <Button
          disabled={isLoading || !form.watch("name") || !form.watch("password")}
          className="w-full bg-[#0d1d90] hover:bg-[#1E1E1E]/90"
        >
          {isLoading ? (
            <LoaderCircle className="mr-2 size-4 animate-spin" />
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </Form>
  );
}
