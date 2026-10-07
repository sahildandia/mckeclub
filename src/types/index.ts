export type Department = {
  id: string;
  name: string;
  short_name: string;
};

export type Club = {
  id: string;
  name: string;
  is_japanese_only: boolean;
  is_aws_only?: boolean;
};

export type Capacity = {
  id: string;
  department_id: string;
  club_id: string;
  capacity: number;
};

export type Registration = {
  id: string;
  student_name: string;
  register_number: string;
  college_email: string;
  phone_number: string;
  department_id: string;
  year: string;
  is_japanese_student: boolean;
  is_aws_interested?: boolean;
  club_id: string;
  status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  confirmation_id: string;
  created_at: string;
};
