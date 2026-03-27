"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

type Provider = { id: string; name: string; speciality: string; colorIndex: number };

type Appt = {
  id: string;
  providerId: string;
  patientName: string;
  status: string;
  startsAt: string;
  endsAt: string;
  slotId: string;
};

type FreeSlot = { id: string; providerId: string; startsAt: string; endsAt: string };

type View = "day" | "week" | "month";

// ── Provider colors ────────────────────────────────────────────────────────────

const COLORS = [
  { block: "bg-blue-100 border-blue-300 text-blue-900",   dot: "bg-blue-500",    header: "bg-blue-500"   },
  { block: "bg-emerald-100 border-emerald-300 text-emerald-900", dot: "bg-emerald-500", header: "bg-emerald-500" },
  { block: "bg-violet-100 border-violet-300 text-violet-900", dot: "bg-violet-500", header: "bg-violet-500" },
  { block: "bg-amber-100 border-amber-300 text-amber-900",   dot: "bg-amber-500",   header: "bg-amber-500"   },
  { block: "bg-rose-100 border-rose-300 text-rose-900",     dot: "bg-rose-500",    header: "bg-rose-500"    },
  { block: "bg-teal-100 border-teal-300 text-teal-900",     dot: "bg-teal-500",    header: "bg-teal-500"    },
  { block: "bg-indigo-100 border-indigo-300 text-indigo-900", dot: "bg-indigo-500", header: "bg-indigo-500" },
  { block: "bg-orange-100 border-orange-300 text-orange-900", dot: "bg-orange-500", header: "bg-orange-500" },
];
function pColor(idx: number) { return COLORS[idx % COLORS.length]; }

// ── Date utilities (same as provider CalendarClient) ──────────────────────────

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_PX = 64, DAY_START = 7, DAY_END = 20;
const GRID_H = (DAY_END - DAY_START) * HOUR_PX;

function toISTStr(d: Date) { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata" }).format(d); }
function addDays(s: string, n: number) { const [y,m,d]=s.split("-").map(Number); return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10); }
function addMonths(s: string, n: number) { const [y,m]=s.split("-").map(Number); const dt=new Date(Date.UTC(y,m-1+n,1)); return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,"0")}-01`; }
function dowMon(s: string) { const [y,m,d]=s.split("-").map(Number); const w=new Date(Date.UTC(y,m-1,d)).getUTCDay(); return w===0?6:w-1; }
function mondayOf(s: string) { return addDays(s,-dowMon(s)); }
function istMidnightUTC(s: string) { const [y,m,d]=s.split("-").map(Number); return new Date(Date.UTC(y,m-1,d,0,0,0)-5.5*3600*1000); }
function apptDay(iso: string) { return toISTStr(new Date(iso)); }

function istHM(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);
  const h=parseInt(parts.find(p=>p.type==="hour")?.value??"0",10);
  const min=parseInt(parts.find(p=>p.type==="minute")?.value??"0",10);
  return {h:h===24?0:h,min};
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",hour:"numeric",minute:"2-digit",hour12:true}).format(new Date(iso));
}
function fmtDayLabel(s: string, short?: boolean) {
  const [y,m,d]=s.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",weekday:short?"short":"long",day:"numeric",month:short?"short":"long",year:short?undefined:"numeric"}).format(new Date(Date.UTC(y,m-1,d,12)));
}
function fmtMonthYear(s: string) {
  const [y,m]=s.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",month:"long",year:"numeric"}).format(new Date(Date.UTC(y,m-1,15,12)));
}

function fetchRange(view: View, base: string) {
  if (view==="day") return {from:base,to:addDays(base,1)};
  if (view==="week") { const mon=mondayOf(base); return {from:mon,to:addDays(mon,7)}; }
  const [y,m]=base.split("-").map(Number);
  const first=`${y}-${String(m).padStart(2,"0")}-01`;
  const last=addDays(addMonths(first,1),-1);
  const gs=addDays(first,-dowMon(first));
  const ld=dowMon(last);
  const ge=ld===6?last:addDays(last,6-ld);
  return {from:gs,to:addDays(ge,1)};
}

// ── Reschedule Modal ───────────────────────────────────────────────────────────

function RescheduleModal({
  appt, freeSlots, providerName, onClose, onDone,
}: {
  appt: Appt; freeSlots: FreeSlot[]; providerName: string;
  onClose: () => void; onDone: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const slots = freeSlots.filter(s => s.providerId === appt.providerId && s.id !== appt.slotId);

  async function confirm() {
    if (!selected) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/frontdesk/appointments/${appt.id}/reschedule`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({slotId: selected}),
      });
      if (!res.ok) { const d=await res.json().catch(()=>({})); throw new Error(d.error||"Failed"); }
      onDone();
    } catch(e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  // Group slots by date
  const grouped: Record<string, FreeSlot[]> = {};
  for (const s of slots) { const k=apptDay(s.startsAt); (grouped[k]??=[]).push(s); }
  const days = Object.keys(grouped).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-900">Reschedule appointment</h2>
            <p className="mt-0.5 text-sm text-slate-500">{appt.patientName} · Dr. {providerName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <p className="mt-1 text-xs text-slate-400">Current: {fmtTime(appt.startsAt)}</p>

        <div className="mt-4 max-h-72 overflow-y-auto space-y-3">
          {days.length === 0 && <p className="text-sm text-slate-400">No free slots available for this provider.</p>}
          {days.map(day => (
            <div key={day}>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{fmtDayLabel(day)}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {grouped[day].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      selected===s.id ? "border-[#2f6ea5] bg-[#e7edf3] text-[#2f6ea5]" : "border-slate-200 hover:border-[#2f6ea5]/50"
                    }`}
                  >
                    {fmtTime(s.startsAt)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={confirm} disabled={!selected || busy}
            className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar sub-components ────────────────────────────────────────────────────

function TimeLabels() {
  return (
    <div className="w-14 shrink-0 border-r border-slate-100">
      {Array.from({length: DAY_END-DAY_START},(_,i)=>{
        const label=new Intl.DateTimeFormat("en-US",{hour:"numeric",hour12:true}).format(new Date(2000,0,1,DAY_START+i));
        return <div key={i} style={{height:HOUR_PX}} className="flex items-start justify-end pr-2 pt-0.5"><span className="text-xs text-slate-400">{label}</span></div>;
      })}
    </div>
  );
}

function GridLines() {
  return <>{Array.from({length:DAY_END-DAY_START},(_,i)=>(
    <div key={i} className="pointer-events-none absolute left-0 right-0 border-t border-slate-100" style={{top:i*HOUR_PX}}/>
  ))}</>;
}

function NowLine({date}: {date: string}) {
  const [pos, setPos] = useState<number|null>(null);
  useEffect(()=>{
    function update() {
      const now=new Date(); if(toISTStr(now)!==date){setPos(null);return;}
      const {h,min}=istHM(now);
      setPos(h>=DAY_START&&h<DAY_END?(h*60+min-DAY_START*60)*(HOUR_PX/60):null);
    }
    update(); const id=setInterval(update,30000); return ()=>clearInterval(id);
  },[date]);
  if(pos===null) return null;
  return <div className="pointer-events-none absolute left-0 right-0 z-20" style={{top:pos}}><div className="flex items-center"><div className="h-2.5 w-2.5 rounded-full bg-rose-500"/><div className="h-px flex-1 bg-rose-500"/></div></div>;
}

function ApptBlock({
  appt, colorIdx, narrow, onReschedule,
}: {
  appt: Appt; colorIdx: number; narrow?: boolean; onReschedule: (a: Appt) => void;
}) {
  const {h:sh,min:sm}=istHM(new Date(appt.startsAt));
  const {h:eh,min:em}=istHM(new Date(appt.endsAt));
  const startM=sh*60+sm, endM=eh*60+em||startM+30, dur=endM-startM||30;
  const top=(startM-DAY_START*60)*(HOUR_PX/60);
  const height=Math.max(dur*(HOUR_PX/60),22);
  if(sh<DAY_START||sh>=DAY_END) return null;
  const c=pColor(colorIdx);
  return (
    <div
      className={`absolute left-0.5 right-0.5 overflow-hidden rounded-lg border px-1.5 py-0.5 text-xs shadow-sm cursor-pointer hover:brightness-95 ${c.block}`}
      style={{top,height}}
      onClick={()=>onReschedule(appt)}
    >
      <div className="truncate font-semibold leading-tight">{appt.patientName}</div>
      {!narrow && height>30 && <div className="truncate opacity-70 leading-tight">{fmtTime(appt.startsAt)}</div>}
    </div>
  );
}

function DayView({date,appointments,providerMap,onReschedule}: {
  date: string; appointments: Appt[]; providerMap: Map<string,Provider>; onReschedule:(a:Appt)=>void;
}) {
  const today=toISTStr(new Date()); const isToday=date===today;
  const dayAppts=appointments.filter(a=>apptDay(a.startsAt)===date);
  return (
    <div className="p-4">
      <div className={`mb-3 text-center text-sm font-semibold ${isToday?"text-[#2f6ea5]":"text-slate-700"}`}>
        {fmtDayLabel(date)}{isToday&&<span className="ml-2 rounded-full bg-[#2f6ea5] px-2 py-0.5 text-xs text-white">Today</span>}
      </div>
      <div className="flex overflow-y-auto rounded-xl border border-slate-100" style={{maxHeight:580}}>
        <TimeLabels/>
        <div className="relative flex-1" style={{height:GRID_H}}>
          <GridLines/><NowLine date={date}/>
          {dayAppts.map(a=><ApptBlock key={a.id} appt={a} colorIdx={providerMap.get(a.providerId)?.colorIndex??0} onReschedule={onReschedule}/>)}
          {dayAppts.length===0&&<div className="flex h-full items-center justify-center text-sm text-slate-400">No appointments</div>}
        </div>
      </div>
    </div>
  );
}

function WeekView({weekStart,appointments,providerMap,onReschedule}: {
  weekStart: string; appointments: Appt[]; providerMap: Map<string,Provider>; onReschedule:(a:Appt)=>void;
}) {
  const today=toISTStr(new Date());
  const days=Array.from({length:7},(_,i)=>addDays(weekStart,i));
  return (
    <div className="overflow-x-auto">
      <div className="flex border-b border-slate-200">
        <div className="w-14 shrink-0"/>
        {days.map((d,i)=>{const [,,dd]=d.split("-").map(Number);const isToday=d===today;return(
          <div key={d} className={`flex-1 border-l border-slate-100 py-2 text-center ${isToday?"bg-[#e7edf3]/50":""}`}>
            <div className="text-xs text-slate-500">{WEEK_LABELS[i]}</div>
            <div className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday?"bg-[#2f6ea5] text-white":"text-slate-800"}`}>{dd}</div>
          </div>
        );})}
      </div>
      <div className="flex overflow-y-auto rounded-b-3xl" style={{maxHeight:560}}>
        <TimeLabels/>
        {days.map(d=>{const dayAppts=appointments.filter(a=>apptDay(a.startsAt)===d);const isToday=d===today;return(
          <div key={d} className={`relative flex-1 border-l border-slate-100 ${isToday?"bg-[#e7edf3]/20":""}`} style={{height:GRID_H}}>
            <GridLines/><NowLine date={d}/>
            {dayAppts.map(a=><ApptBlock key={a.id} appt={a} colorIdx={providerMap.get(a.providerId)?.colorIndex??0} narrow onReschedule={onReschedule}/>)}
          </div>
        );})}
      </div>
    </div>
  );
}

function MonthView({base,appointments,providerMap,onReschedule}: {
  base: string; appointments: Appt[]; providerMap: Map<string,Provider>; onReschedule:(a:Appt)=>void;
}) {
  const today=toISTStr(new Date());
  const [y,m]=base.split("-").map(Number);
  const first=`${y}-${String(m).padStart(2,"0")}-01`;
  const last=addDays(addMonths(first,1),-1);
  const gs=addDays(first,-dowMon(first));
  const ld=dowMon(last);
  const ge=ld===6?last:addDays(last,6-ld);
  const cells:string[]=[];let cur=gs;while(cur<=ge){cells.push(cur);cur=addDays(cur,1);}
  const byDay:Record<string,Appt[]>={};
  for(const a of appointments){const k=apptDay(a.startsAt);(byDay[k]??=[]).push(a);}
  return (
    <div className="overflow-hidden rounded-3xl">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEK_LABELS.map(l=><div key={l} className="py-2 text-center text-xs font-semibold text-slate-500">{l}</div>)}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
        {cells.map(d=>{
          const [,dm,dd]=d.split("-").map(Number);
          const inMonth=dm===m,isToday=d===today;
          const dayAppts=byDay[d]??[];
          return(
            <div key={d} className={`min-h-[108px] p-1.5 ${inMonth?"bg-white":"bg-slate-50/70"}`}>
              <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday?"bg-[#2f6ea5] text-white":inMonth?"text-slate-800":"text-slate-400"}`}>{dd}</div>
              <div className="space-y-0.5">
                {dayAppts.slice(0,3).map(a=>{const c=pColor(providerMap.get(a.providerId)?.colorIndex??0);return(
                  <button key={a.id} onClick={()=>onReschedule(a)} className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-xs truncate hover:opacity-80 ${c.block}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`}/>
                    <span className="truncate">{fmtTime(a.startsAt)} · {a.patientName}</span>
                  </button>
                );})}
                {dayAppts.length>3&&<div className="px-1 text-xs text-slate-400">+{dayAppts.length-3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CalendarClient({ initialProviders }: { initialProviders: Provider[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<View>("week");
  const [base, setBase] = useState(toISTStr(new Date()));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialProviders.map(p=>p.id)));
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appt|null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const providerMap = new Map(initialProviders.map(p=>[p.id,p]));

  const load = useCallback(async (v: View, b: string, ids: Set<string>) => {
    setLoading(true);
    try {
      const {from,to}=fetchRange(v,b);
      const fromUTC=istMidnightUTC(from).toISOString();
      const toUTC=istMidnightUTC(to).toISOString();
      const provQ=ids.size>0&&ids.size<initialProviders.length?`&providers=${[...ids].join(",")}`:"";
      const res=await fetch(`/api/frontdesk/calendar?from=${encodeURIComponent(fromUTC)}&to=${encodeURIComponent(toUTC)}${provQ}`);
      if(res.ok){const d=await res.json();setAppointments(d.appointments??[]);setFreeSlots(d.freeSlots??[]);}
    } finally {setLoading(false);}
  },[initialProviders.length]);

  useEffect(()=>{load(view,base,selectedIds);},[view,base,selectedIds,load]);

  function navigate(dir:-1|1) {
    setBase(b=>{
      if(view==="day") return addDays(b,dir);
      if(view==="week") return addDays(b,dir*7);
      return addMonths(b,dir);
    });
  }

  function toggleProvider(id: string) {
    setSelectedIds(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  }

  function headerLabel() {
    if(view==="day") return fmtDayLabel(base);
    if(view==="week"){const mon=mondayOf(base);return `${fmtDayLabel(mon,true)} – ${fmtDayLabel(addDays(mon,6),true)}`;}
    return fmtMonthYear(base);
  }

  function handleReschedule(a: Appt) { setRescheduleTarget(a); }

  return (
    <div className="space-y-4">
      {rescheduleTarget && (
        <RescheduleModal
          appt={rescheduleTarget}
          freeSlots={freeSlots}
          providerName={providerMap.get(rescheduleTarget.providerId)?.name.replace(/^dr\.?\s+/i,"") ?? ""}
          onClose={()=>setRescheduleTarget(null)}
          onDone={()=>{setRescheduleTarget(null);startTransition(() => router.refresh());load(view,base,selectedIds);}}
        />
      )}

      {/* Toolbar */}
      <div className="rounded-[32px] border border-white/70 bg-white/90 px-6 py-4 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={()=>navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            </button>
            <h2 className="min-w-[220px] text-center text-sm font-semibold text-slate-900">{headerLabel()}</h2>
            <button onClick={()=>navigate(1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
            </button>
            <button onClick={()=>setBase(toISTStr(new Date()))} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">Today</button>
            {loading && <span className="text-xs text-slate-400">Loading…</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setSidebarOpen(o=>!o)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[#2f6ea5]">
              Providers ({selectedIds.size}/{initialProviders.length})
            </button>
            <div className="flex rounded-full border border-slate-200 p-0.5">
              {(["day","week","month"] as View[]).map(v=>(
                <button key={v} onClick={()=>setView(v)} className={`rounded-full px-4 py-1 text-xs font-semibold capitalize transition ${view===v?"bg-[#2f6ea5] text-white shadow-sm":"text-slate-600 hover:text-slate-900"}`}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Provider filter */}
        {sidebarOpen && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>setSelectedIds(new Set(initialProviders.map(p=>p.id)))} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">All</button>
              {initialProviders.map(p=>{const c=pColor(p.colorIndex);const active=selectedIds.has(p.id);return(
                <button key={p.id} onClick={()=>toggleProvider(p.id)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${active?"border-transparent text-white":"border-slate-200 text-slate-600 hover:bg-slate-50"}`} style={active?{backgroundColor:COLORS[p.colorIndex%8].dot.replace("bg-","").replace(/-(.*)/,"")}:{}}>
                  <span className={`h-2 w-2 rounded-full ${c.dot}`}/>
                  {p.name.replace(/^dr\.?\s+/i,"")}
                </button>
              );})}
            </div>
          </div>
        )}
      </div>

      {/* Calendar body */}
      <div className="rounded-3xl border border-white/70 bg-white/90 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        {view==="day" && <DayView date={base} appointments={appointments} providerMap={providerMap} onReschedule={handleReschedule}/>}
        {view==="week" && <WeekView weekStart={mondayOf(base)} appointments={appointments} providerMap={providerMap} onReschedule={handleReschedule}/>}
        {view==="month" && <MonthView base={base} appointments={appointments} providerMap={providerMap} onReschedule={handleReschedule}/>}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {initialProviders.map(p=>{const c=pColor(p.colorIndex);return(
          <span key={p.id} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`}/>
            {p.name}
          </span>
        );})}
      </div>
      <p className="px-1 text-xs text-slate-400">Click any appointment block to reschedule it.</p>
    </div>
  );
}
