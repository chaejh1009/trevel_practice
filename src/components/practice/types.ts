import type { TaxiBoardingResult, TaxiRideRequest } from "../../lib/taxiRide";

export interface PracticeProps {
  onFinish: () => void;
  track: (type: string, properties: Record<string, unknown>) => void;
  onGuide?: (text: string) => void;
  onRideRequested?: (request: TaxiRideRequest) => Promise<TaxiBoardingResult>;
}
