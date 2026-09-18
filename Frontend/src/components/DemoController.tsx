import React, { useState, useEffect } from 'react';
import { ActiveView, DemoStep } from '../types';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  X,
  Layers,
  Network,
  Bell,
  Activity
} from 'lucide-react';

interface DemoControllerProps {
  currentStep: number;
  onSetStep: (step: number) => void;
  onClose: () => void;
  onNavigate: (view: ActiveView) => void;
  onSimulateEvent: (step: number) => void;
}

export const DEMO_STEPS: DemoStep[] = [
  {
    step: 1,
    title: '1. Baseline Financial Traffic Flowing',
    description: 'Normal inter-bank transactions are processed through the firewall with low risk scores and instant ALLOW decisions.',
    actionHint: 'Observe normal retail wires flowing through JPMorgan Chase and Barclays.',
    targetView: 'overview',
    narration: 'Under normal load, the behavioral engine verifies counterparties and approves transactions in under 12ms.'
  },
  {
    step: 2,
    title: '2. Suspicious High-Velocity Activity Emerges',
    description: 'A sudden burst of abnormal wires enters the settlement queue with elevated velocity and new account age indicators.',
    actionHint: 'Notice higher value transfers appearing with HOLD decisions and elevated risk scores.',
    targetView: 'transactions',
    narration: 'The firewall flags transactions based on velocity spikes and recipient concentration.'
  },
  {
    step: 3,
    title: '3. Coordinated Mule Ring Signature Detected',
    description: 'Fraudinate connects disparate accounts across Chase, Wells Fargo, and Revolut into a unified mule topology.',
    actionHint: 'A CRITICAL alert is triggered for multi-bank fund dispersion.',
    targetView: 'alerts',
    narration: 'Rather than isolating single accounts, Fraudinate detects graph-level fan-out patterns across multiple banking rails.'
  },
  {
    step: 4,
    title: '4. Dynamic Risk Score Surges (94 / 100)',
    description: 'The explainable risk model integrates network fan-out and transaction velocity, raising risk score to 94.',
    actionHint: 'Risk index climbs rapidly into the critical block threshold.',
    targetView: 'overview',
    narration: 'Heuristic weights amplify when high transaction value aligns with suspicious connection clusters.'
  },
  {
    step: 5,
    title: '5. Real-Time Intervention: BLOCK Enforced',
    description: 'The real-time firewall automatically intercepts and blocks outbound funds before clearing domestic rails.',
    actionHint: 'Examine the instant BLOCK decision on the primary transfer #10492.',
    targetView: 'transactions',
    highlightId: '10492',
    narration: 'Total prevention latency remains under 15ms, halting fund propagation mid-settlement.'
  },
  {
    step: 6,
    title: '6. Investigator Opens Security Alert',
    description: 'Security operations officer opens the primary incident dossier to review aggregate financial exposure.',
    actionHint: 'Investigating Alert #ALT-8091 with $148,500 total exposure across 4 banks.',
    targetView: 'alerts',
    highlightId: 'ALT-8091',
    narration: 'Alerts aggregate multi-entity blast radiuses rather than flooding analysts with single-ticket noise.'
  },
  {
    step: 7,
    title: '7. Network Graph Unmasks Connected Accounts',
    description: 'Full topological intelligence displays the central mule node (US-WF-44219) fanning out to 3 synthetic accounts.',
    actionHint: 'Explore the red glowing mule ring in the interactive network graph.',
    targetView: 'network',
    highlightId: 'acc-mule-central',
    narration: 'Visual graph topology immediately reveals the funneling origin and rapid multi-hop dispersion paths.'
  },
  {
    step: 8,
    title: '8. Explainable Signals Validate Decision',
    description: 'Investigator inspects the exact causal heuristics: HIGH NETWORK FAN-OUT, RAPID FUND MOVEMENT, MULTI-BANK CONNECTION.',
    actionHint: 'Review the explainable risk signals backing the firewall action.',
    targetView: 'transactions',
    highlightId: '10492',
    narration: 'Every decision is explainable for compliance and auditing, providing immediate justification.'
  }
];

export const DemoController: React.FC<DemoControllerProps> = ({
  currentStep,
  onSetStep,
  onClose,
  onNavigate,
  onSimulateEvent
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const activeStepData = DEMO_STEPS[currentStep - 1] || DEMO_STEPS[0];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStep < DEMO_STEPS.length) {
          goToStep(currentStep + 1);
        } else {
          setIsPlaying(false);
        }
      }, 5500);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const goToStep = (stepNumber: number) => {
    onSetStep(stepNumber);
    const target = DEMO_STEPS[stepNumber - 1];
    if (target) {
      onNavigate(target.targetView);
      onSimulateEvent(stepNumber);
    }
  };

  const handleNext = () => {
    if (currentStep < DEMO_STEPS.length) {
      goToStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const handleRestart = () => {
    goToStep(1);
    setIsPlaying(false);
  };

  return (
    <div
      id="demo-controller-modal"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl bg-[#090e18]/95 border-2 border-cyan-500/40 rounded-2xl shadow-2xl backdrop-blur-xl p-4 sm:p-5 text-white transition-all animate-in fade-in slide-in-from-bottom-6"
    >
      {/* Top Controller Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                Hackathon Presentation Mode
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                Step {currentStep} of {DEMO_STEPS.length}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-100">
              {activeStepData.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-demo-autoplay-toggle"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors border ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Story' : 'Auto Play'}</span>
          </button>

          <button
            id="btn-demo-reset-story"
            onClick={handleRestart}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Restart Demo from Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-close-demo-controller"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Story Controller"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Dots Step Indicator */}
      <div className="flex items-center gap-1.5 py-3">
        {DEMO_STEPS.map((s) => (
          <button
            key={s.step}
            id={`step-dot-${s.step}`}
            onClick={() => goToStep(s.step)}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              s.step === currentStep
                ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                : s.step < currentStep
                ? 'bg-emerald-500/80'
                : 'bg-slate-800'
            }`}
            title={`Jump to Step ${s.step}: ${s.title}`}
          />
        ))}
      </div>

      {/* Step Narration Card */}
      <div className="bg-[#05080f] rounded-xl p-3 border border-slate-800/80 text-xs font-mono space-y-2">
        <p className="text-slate-300 leading-relaxed font-sans text-xs">
          {activeStepData.description}
        </p>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
          <div className="flex items-center gap-1.5 text-cyan-300">
            <ArrowRight className="w-3 h-3 shrink-0" />
            <span className="font-semibold">{activeStepData.actionHint}</span>
          </div>
          <span className="text-slate-500 uppercase">
            Active Target: {activeStepData.targetView}
          </span>
        </div>
      </div>

      {/* Controls: Prev / Next */}
      <div className="flex items-center justify-between pt-3">
        <button
          id="btn-demo-prev-step"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-mono text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Step</span>
        </button>

        <span className="text-[11px] font-mono text-slate-500">
          Showing real-time transaction firewall intervention
        </span>

        <button
          id="btn-demo-next-step"
          onClick={handleNext}
          disabled={currentStep === DEMO_STEPS.length}
          className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-xs font-mono font-bold text-white shadow-md shadow-cyan-950 flex items-center gap-1 transition-colors"
        >
          <span>Next Step</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
