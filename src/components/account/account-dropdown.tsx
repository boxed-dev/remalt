'use client';

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createClient } from "@/lib/supabase/client";

export function AccountDropdown() {
  const { user } = useCurrentUser();
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [currentOrg, setCurrentOrg] = useState<string>("Personal");

  useEffect(() => {
    if (user) {
      const fetchOrgs = async () => {
        const supabase = createClient();
        const { data, error } = await supabase.rpc('get_organizations_for_user', {
          user_id: user.id,
        });
        
        if (error) {
          console.error("Error fetching organizations:", error);
        } else {
          setOrganizations(data.map((org: any) => org.name));
        }
      };

      fetchOrgs();
    }
  }, [user]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="flex items-center space-x-2">
          <span>{currentOrg}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem key={org} onSelect={() => setCurrentOrg(org)}>
            {org}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
