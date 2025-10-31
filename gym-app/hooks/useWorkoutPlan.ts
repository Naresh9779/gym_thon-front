// "use client";
// import { useEffect, useState } from "react";
// import { fetcher } from "@/lib/api";

// export function useWorkoutPlan(userId: string) {
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     let mounted = true;
    
//     (async () => {
//       try {
//         const result = await fetcher(`/api/user/getWorkoutPlan/${userId}`);
//         const planObj = result["Workout Plan"] || {};
//         const days = Object.entries(planObj)
//           .filter(([key]) => key.startsWith("Day"))
//           .map(([label, data]: any) => ({ label, ...data.Workout }));
        
//         if (mounted) setData({ days, meta: planObj });
//       } catch (e: any) {
//         if (mounted) setError(e.message);
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     })();

//     return () => { mounted = false; };
//   }, [userId]);

//   return { data, loading, error };
// }
