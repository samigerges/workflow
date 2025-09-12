import { WORKFLOW_STEPS } from "@/lib/constants";
import { 
  FileText, 
  File, 
  Edit,
  University, 
  Ship, 
  ClipboardList,
  Package,
  Bell,
  Download,
  DollarSign
} from "lucide-react";

const iconMap = {
  'file-text': FileText,
  'file-contract': File,
  'edit': Edit,
  'university': University,
  'ship': Ship,
  'clipboard-list': ClipboardList,
  'package': Package,
  'bell': Bell,
  'download': Download,
  'dollar-sign': DollarSign
};

export default function WorkflowProgress() {
  // Mock progress data - in real implementation this would come from props or API
  const stepProgress = [
    { id: 'statement_of_needs', progress: 85 },
    { id: 'contract_request', progress: 70 },
    { id: 'contract_drafting', progress: 60 },
    { id: 'letter_of_credit', progress: 45 },
    { id: 'vessel_nomination', progress: 30 }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-4">
      {WORKFLOW_STEPS.slice(0, 5).map((step, index) => {
        const Icon = iconMap[step.icon as keyof typeof iconMap] || FileText;
        const progress = stepProgress.find(p => p.id === step.id)?.progress || 0;
        
        return (
          <div key={step.id} className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon className="text-blue-600" size={24} />
            </div>
            <h3 className="font-semibold text-secondary-900 mb-1">{step.title}</h3>
            <p className="text-sm text-secondary-600 mb-2">{step.description}</p>
            <div className="bg-secondary-100 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-secondary-500 mt-1">{progress}%</p>
          </div>
        );
      })}
    </div>
  );
}
