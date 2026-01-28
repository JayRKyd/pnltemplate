"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AddToTeamPage() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleAddUsers = async () => {
    setLoading(true);
    setStatus("Adding users to Bono team...");
    
    try {
      const response = await fetch("/api/admin/add-to-team", {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus("✅ Success! All users added to Bono team. Please sign out and sign back in.");
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Add Users to Bono Team</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          This will add Jordy and Bogdan to the Bono team as admins.
        </p>
        
        <Button 
          onClick={handleAddUsers} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Adding..." : "Add Users to Bono Team"}
        </Button>
        
        {status && (
          <div className="mt-4 p-3 rounded bg-gray-100 dark:bg-gray-700">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
