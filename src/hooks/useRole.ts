import { useState, useEffect } from 'react';

export type UserRole = 'Manager' | 'Landlord' | 'Tenant';

export interface Landlord {
  id: string;
  name: string;
  portfolioSize: string;
}

export const MOCK_LANDLORDS: Landlord[] = [
  { id: 'LL-001', name: 'Kathmandu Realty Group', portfolioSize: '24 Properties' },
  { id: 'LL-002', name: 'Pokhara Lakeside Estates', portfolioSize: '12 Properties' },
  { id: 'LL-003', name: 'Lalitpur Housing Co.', portfolioSize: '8 Properties' },
];

export function useRole() {
  const [role, setRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('user-role');
    return (savedRole as UserRole) || 'Manager';
  });

  const [selectedLandlordId, setSelectedLandlordId] = useState<string>(() => {
    return localStorage.getItem('selected-landlord-id') || MOCK_LANDLORDS[0].id;
  });

  useEffect(() => {
    localStorage.setItem('user-role', role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('selected-landlord-id', selectedLandlordId);
  }, [selectedLandlordId]);

  const selectedLandlord = MOCK_LANDLORDS.find(l => l.id === selectedLandlordId) || MOCK_LANDLORDS[0];

  return { 
    role, 
    setRole, 
    selectedLandlordId, 
    setSelectedLandlordId,
    selectedLandlord,
    landlords: MOCK_LANDLORDS
  };
}
