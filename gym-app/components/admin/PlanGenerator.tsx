"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PlanGenerator() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader title="Generate Plan" subtitle="Create AI-powered plans for clients" />
      <CardBody>
        <div className="space-y-3">
          <button
            onClick={() => router.push("/generate/workout")}
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left"
          >
            <span className="text-2xl">💪</span>
            <div>
              <p className="font-semibold text-gray-900">Workout Plan</p>
              <p className="text-sm text-gray-500">Generate a personalized training cycle</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/generate/diet")}
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left"
          >
            <span className="text-2xl">🥗</span>
            <div>
              <p className="font-semibold text-gray-900">Diet Plan</p>
              <p className="text-sm text-gray-500">Generate a daily nutrition plan</p>
            </div>
          </button>

          <div className="pt-1">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/generate")}
            >
              View All Generation Options
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
