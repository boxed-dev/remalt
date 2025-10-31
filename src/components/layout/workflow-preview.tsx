import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, MessageSquare, FileText, Send } from "lucide-react";

export function WorkflowPreview() {
  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div>
            <div className="mb-6">
              <span className="inline-flex items-center rounded-full bg-[#D4AF7F]/20 px-4 py-2 text-sm font-medium text-[#095D40]">
                🚀 Workflow Builder
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-gray-900 mb-6">
              Build canvas
              <br />
              <span className="bg-gradient-to-r from-[#095D40] to-[#D4AF7F] bg-clip-text text-transparent">
                visually
              </span>
            </h2>

            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              No coding required. Simply drag and drop components to create
              sophisticated AI canvas. Connect data sources, apply AI models,
              and automate your processes with ease.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Drag & drop interface</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Pre-built AI components</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Real-time testing</span>
              </div>
            </div>

            <Button className="apple-button">
              Try Workflow Builder
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Workflow Preview */}
          <div className="relative">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Content Generator</h3>
                    <Button size="sm" variant="outline">
                      <Play className="w-4 h-4 mr-2" />
                      Run
                    </Button>
                  </div>

                  {/* Workflow Steps */}
                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#095D40]/10 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-[#095D40]" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="text-sm font-medium mb-1">Input Prompt</div>
                          <div className="text-xs text-gray-600">Write a blog post about...</div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#D4AF7F]/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#D4AF7F]" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="text-sm font-medium mb-1">AI Processing</div>
                          <div className="text-xs text-gray-600">Generate content using GPT-4</div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#095D40]/10 rounded-lg flex items-center justify-center">
                        <Send className="w-5 h-5 text-[#095D40]" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="text-sm font-medium mb-1">Output</div>
                          <div className="text-xs text-gray-600">Save to CMS or export as PDF</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-[#095D40]/20 to-[#D4AF7F]/30 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-[#D4AF7F]/20 to-[#095D40]/30 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}