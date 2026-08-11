"use client";
import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import type { Mission } from "@/types";
import { format } from "date-fns";
const priorityTone={low:"neutral",medium:"blue",high:"warning",critical:"danger"} as const;
export function ActiveMissions({ missions }: { missions: Mission[] }) { return <Card><CardHeader title="Active Missions" eyebrow={`${missions.length} in progress`} action={<a href="#" className="text-xs text-accent-blue-soft hover:underline">View all</a>}/><div className="space-y-3">{missions.map((m,i)=><motion.div key={m.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{duration:.3,delay:i*.05}} className="flex items-center gap-3"><span className="font-mono-num text-[11px] text-text-tertiary w-6 shrink-0">{String(i+1).padStart(2,"0")}</span><div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-2 mb-1.5"><p className="text-sm font-medium text-text-primary truncate">{m.title}</p><span className="font-mono-num text-xs text-text-secondary shrink-0">{m.progress}%</span></div><ProgressBar percent={m.progress} height={6}/></div><Badge tone={priorityTone[m.priority]} className="hidden sm:inline-flex shrink-0">{format(new Date(m.deadline),"MMM d")}</Badge></motion.div>)}</div></Card>; }
