import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { supabase } from "@/lib/supabase";

const BONO_TEAM_ID = "2f7dd8f4-fd8e-4838-b703-e8f4fc5d3a43";

const USERS_TO_ADD = [
  { id: "ed9a0cd7-0e56-4af6-ae18-48c6cd77a562", email: "knowlesjr95@gmail.com", name: "Jordy" },
  { id: "49724366-5754-49ce-a43c-f9394eddb15e", email: "bogdan@bono.ro", name: "Bogdan" },
];

export async function POST() {
  try {
    console.log("[add-to-team] Starting to add users to Bono team");
    
    // Get the Bono team
    const team = await stackServerApp.getTeam(BONO_TEAM_ID);
    if (!team) {
      return NextResponse.json({ success: false, error: "Bono team not found" }, { status: 404 });
    }
    
    console.log("[add-to-team] Found Bono team:", team.displayName);
    
    const results: { user: string; status: string }[] = [];
    
    for (const userData of USERS_TO_ADD) {
      try {
        console.log(`[add-to-team] Processing ${userData.email}...`);
        
        // Try to add user to Stack Auth team
        try {
          await team.addUser(userData.id);
          console.log(`[add-to-team] Added ${userData.email} to Stack Auth team`);
        } catch (stackErr: any) {
          // User might already be in team
          console.log(`[add-to-team] Stack Auth note for ${userData.email}:`, stackErr.message || stackErr);
        }
        
        // Add to Supabase team_memberships
        const { error: memberError } = await supabase
          .from("team_memberships")
          .upsert({
            team_id: BONO_TEAM_ID,
            user_id: userData.id,
            role: "admin",
          }, { onConflict: "team_id,user_id" });
        
        if (memberError) {
          console.log(`[add-to-team] Supabase membership note for ${userData.email}:`, memberError.message);
        }
        
        // Update user's default team
        const { error: userError } = await supabase
          .from("stack_users")
          .update({ team_id: BONO_TEAM_ID })
          .eq("id", userData.id);
        
        if (userError) {
          console.log(`[add-to-team] Supabase user note for ${userData.email}:`, userError.message);
        }
        
        results.push({ user: userData.email, status: "success" });
      } catch (err: any) {
        console.error(`[add-to-team] Error for ${userData.email}:`, err);
        results.push({ user: userData.email, status: `error: ${err.message}` });
      }
    }
    
    console.log("[add-to-team] Completed. Results:", results);
    
    return NextResponse.json({ 
      success: true, 
      message: "Users processed",
      results 
    });
  } catch (err: any) {
    console.error("[add-to-team] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
