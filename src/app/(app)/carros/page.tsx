import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Vehicle, VehicleCost, VehicleInstallment } from "@/lib/database.types";
import { CarrosClient } from "./carros-client";

export const metadata={title:"Carros · Finanças do Casal"};
export default async function CarrosPage(){
  const session=await requireSession(); const supabase=await createClient();
  const [vehiclesRes,costsRes,installmentsRes,accountsRes]=await Promise.all([
    supabase.from("vehicles").select("*").eq("couple_id",session.couple.id).neq("status","cancelado").order("status").order("purchase_date",{ascending:false}),
    supabase.from("vehicle_costs").select("*").eq("couple_id",session.couple.id),
    supabase.from("vehicle_sale_installments").select("*").eq("couple_id",session.couple.id).is("paid_on",null).order("due_on"),
    supabase.from("accounts").select("id,name,type").eq("couple_id",session.couple.id).eq("archived",false),
  ]);
  return <CarrosClient vehicles={(vehiclesRes.data??[]) as Vehicle[]} costs={(costsRes.data??[]) as VehicleCost[]} installments={(installmentsRes.data??[]) as VehicleInstallment[]} hasCashAccount={(accountsRes.data??[]).some(a=>a.type==="dinheiro"&&a.name==="Dinheiro em mãos")} moeda={session.couple.primary_currency}/>;
}
