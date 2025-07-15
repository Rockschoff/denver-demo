import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingDown, TrendingUp, TrendingUpDown } from "lucide-react";

export interface MetricCardProps {
  title: string;
  metricValue: string;
  badgeValue: string;
  badgeIcon: "trending-up" | "trending-down" | "trending-up-down" | "none";
  footerText: string | { line1: string; line2?: string };
}

export default function MetricCard(props: MetricCardProps) {
  const renderIcon = () => {
    switch (props.badgeIcon) {
      case "trending-up":
        return <TrendingUp className="mr-1 h-4 w-4" />;
      case "trending-down":
        return <TrendingDown className="mr-1 h-4 w-4" />;
      case "trending-up-down":
        return <TrendingUpDown className="mr-1 h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    
      <Card className="w-[280px] @container/card">
        <CardHeader>
          <CardDescription>{props.title}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {props.metricValue}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {renderIcon()}
              {props.badgeValue}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {typeof props.footerText === "string"
              ? props.footerText
              : props.footerText.line1}
          </div>
          <div className="text-muted-foreground">
            {typeof props.footerText !== "string" && props.footerText.line2}
          </div>
        </CardFooter>
      </Card>

  );
}
