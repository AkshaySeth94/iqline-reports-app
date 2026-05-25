export interface Report {
  _id: string;
  patient: string;
  reportDate: string;
  status: 'Final' | 'Corrected';
  notes?: string;
  reportType: 'GlucoseMarker';
  data: {
    glucoseValue: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  phone: string;
  role: 'Admin' | 'Patient';
}

export interface DecodedToken {
  exp: number;
  iat: number;
  name: string;
  phone: string;
  role: 'Admin' | 'Patient';
  sub: string;
}
