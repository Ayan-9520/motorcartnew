import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  LineChart,
  Gavel,
  Bot,
  Share2,
  Headphones,
  Package,
  BarChart3,
  Bell,
} from "lucide-react";
import { aiAgents } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/axios";

const agentIcons = [
  Brain,
  LineChart,
  Gavel,
  Bot,
  Share2,
  Headphones,
  Package,
  BarChart3,
  Bell,
];

export function AIFeaturesSection() {
  const agents = aiAgents.slice(0, 9);
  const readyQ = useQuery({
    queryKey: ["api-ready"],
    queryFn: async () => (await api.get("/api/ready")).data,
    staleTime: 60_000,
    retry: 0,
  });
  const aiConfigured = readyQ.data?.checks?.aiKeyConfigured === true;

  return (
    <section className="home-section-alt relative overflow-hidden">
      <div className="container relative mx-auto home-stack px-4">
        <SectionHeader
          eyebrow="AI automation"
          title="9 AI Agents Powering Motorcart"
          description="From lead qualification to 24/7 support — intelligent automation at every touchpoint."
          href="/ai"
          linkLabel="Explore AI"
        />
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, index) => {
            const Icon = agentIcons[index % agentIcons.length];
            return (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="home-ai-card"
              >
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-primary)]">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{agent.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  {aiConfigured ? <span className="ai-pulse" /> : null}
                  {aiConfigured ? "Configured" : "Not configured"}
                </span>
              </motion.div>
            );
          })}
        </div>
        <div className="text-center">
          <Button size="sm" className="home-section-cta rounded-lg" asChild>
            <Link to="/ai">See AI in Action</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
