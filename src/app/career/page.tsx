import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Link2, Globe, Users } from "lucide-react";
import { getCareer } from "@/lib/db";
import { CareerBoard } from "@/components/domain/career-board";
import { CareerApplicationForm } from "@/components/domain/career-application-form";
import { localDateKey } from "@/lib/dates";
import type { JobApplication } from "@/types";
export const dynamic="force-dynamic";
const checklist=[{icon:FileText,label:"Resume",status:"Keep current",tone:"neutral" as const},{icon:Link2,label:"LinkedIn",status:"Keep profile current",tone:"neutral" as const},{icon:Globe,label:"Portfolio",status:"Show recent work",tone:"neutral" as const},{icon:Users,label:"Networking",status:"Connect consistently",tone:"neutral" as const}];
export default async function CareerPage(){const jobs=await getCareer();const applications:JobApplication[]=jobs.map(j=>({id:j.id,company:j.company,role:j.role,stage:j.stage.toLowerCase() as JobApplication["stage"],appliedOn:j.appliedOn.toISOString()}));return <AppShell title="Career"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{checklist.map(c=><Card key={c.label} className="flex flex-col items-start gap-2"><c.icon className="h-5 w-5 text-accent-blue-soft"/><p className="text-sm font-medium text-text-primary">{c.label}</p><Badge tone={c.tone}>{c.status}</Badge></Card>)}</div><CareerApplicationForm today={localDateKey(new Date())}/><Card><div className="mb-4"><p className="text-lg font-display font-semibold text-text-primary">Job Tracker</p><p className="text-[11px] text-text-tertiary">Choose a stage directly on each application card</p></div><CareerBoard applications={applications}/></Card></AppShell>}
