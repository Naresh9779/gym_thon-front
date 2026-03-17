"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface SubscriptionExpiredProps {
  endDate?: string;
}

export default function SubscriptionExpired({ endDate }: SubscriptionExpiredProps) {
  const router = useRouter();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-lg mx-auto p-8">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Subscription Expired</h2>
        <p className="text-gray-600 mb-2">
          Your subscription has expired
          {endDate ? ` on ${new Date(endDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : ""}.
        </p>
        <p className="text-gray-500 mb-8 text-sm">
          Contact your trainer to renew your subscription and regain access to your workout and diet plans.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => router.push("/profile")}
          >
            View Subscription Details
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push("/progress")}
          >
            View Past Progress
          </Button>
        </div>
      </div>
    </div>
  );
}
