"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageCircle, Code2, Briefcase, CircleDollarSign, HeartPulse, BrainCircuit } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import type { LifeArea } from "@/types";
const icons={MessageCircle,Code2,Briefcase,CircleDollarSign,HeartPulse,BrainCircuit};
export function LifeAreas({ lifeAreas }: { lifeAreas: LifeArea[] }) { return <Card><CardHeader title="Life Areas Progress" eyebrow="Percentage of progress across every domain"/><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">{lifeAreas.map((area,i)=>{const Icon=icons[area.icon as keyof typeof icons]??BrainCircuit; return <Link key={area.key} href={`/${area.key}`}><motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{duration:.35,delay:i*.06}} whileHover={{y:-3}} className="flex flex-col items-center gap-2 rounded-xl p-3 hover:bg-white/[0.03] transition-colors cursor-pointer"><ProgressRing percent={area.percent} size={84} strokeWidth={7} color={area.color} colorTo="var(--accent-purple)"><div className="flex flex-col items-center"><Icon className="h-4 w-4 mb-0.5" style={{color:area.color}}/><span className="font-display text-base font-bold">{area.percent}%</span></div></ProgressRing><p className="text-xs font-semibold text-text-primary text-center">{area.label}</p><p className="text-[10px] text-text-tertiary">{area.status}</p></motion.div></Link>})}</div></Card>; }
