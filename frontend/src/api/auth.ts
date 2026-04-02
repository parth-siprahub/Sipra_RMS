import { api } from './client';

export interface UserCreate {
    email: string;
    password?: string;
    full_name: string;
    role: string;
}

export const authApi = {
    createUser: async (data: UserCreate) => {
        return api.post<any>('/auth/create-user', data);
    }
};
