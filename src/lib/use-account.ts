import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchAccount } from "./account.functions";

export function useAccount() {
  const load = useServerFn(fetchAccount);
  return useQuery({
    queryKey: ["account"],
    queryFn: () => load(),
    staleTime: 5_000,
  });
}
