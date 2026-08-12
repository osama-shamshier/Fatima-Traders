'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, Lock } from 'lucide-react';
import { RoleFormModal } from '@/components/roles/RoleFormModal';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAdd = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleEdit = (role: any) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleDelete = async (role: any) => {
    if (role.isSystem) {
      alert('System roles cannot be deleted.');
      return;
    }
    
    if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      try {
        const res = await fetch(`/api/roles/${role.id}`, {
          method: 'DELETE',
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        fetchRoles();
      } catch (error: any) {
        alert(error.message || 'Failed to delete role');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Role Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user roles and their associated permissions across the system.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Role
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading roles...
                  </td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No roles found. Create one to get started.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{role.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {role.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {role.permissions?.length || 0} configured
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {role.isSystem ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Lock className="h-3 w-3" />
                          System
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(role.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleEdit(role)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => handleDelete(role)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RoleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRoles}
        roleToEdit={selectedRole}
      />
    </div>
  );
}
