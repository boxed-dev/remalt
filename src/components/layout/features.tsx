import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Workflow, Library, Zap, Brain, Users } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Interface",
    description: "Intuitive chat interface for seamless AI interactions and prompt testing.",
  },
  {
    icon: Library,
    title: "Prompt Collections",
    description: "Curated library of proven prompts for different use cases and industries.",
  },
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    description: "Drag-and-drop interface to create complex AI automation workflows.",
  },
  {
    icon: Zap,
    title: "One-Click Automation",
    description: "Deploy and run your AI workflows with a single click.",
  },
  {
    icon: Brain,
    title: "Smart Optimization",
    description: "AI-powered suggestions to improve your workflow performance.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Share and collaborate on workflows with your team members.",
  },
];

export function Features() {
  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-gray-900 mb-6">
            Everything you need to
            <br />
            <span className="bg-gradient-to-r from-[#095D40] to-[#D4AF7F] bg-clip-text text-transparent">
              automate with AI
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Powerful tools designed for modern teams who want to harness
            the full potential of artificial intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer"
              >
                <CardContent className="p-8 text-center">
                  <div className="mb-6 mx-auto w-16 h-16 bg-gradient-to-br from-[#095D40]/10 to-[#D4AF7F]/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-[#095D40]" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}