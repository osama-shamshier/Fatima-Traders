'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, ChevronDown, ChevronRight, Check } from 'lucide-react';

const roleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).min(1, 'Select at least one permission'),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: any | null;
}

export function RoleFormModal({ isOpen, onClose, onSuccess, roleToEdit }: RoleFormModalProps) {
  const [permissionsByModule, setPermissionsByModule] = useState<Record<string, any[]>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissionIds: [],
    },
  });

  const selectedPermissionIds = watch('permissionIds');

  useEffect(() => {
    if (isOpen) {
      fetchPermissions();
      if (roleToEdit) {
        reset({
          name: roleToEdit.name,
          description: roleToEdit.description || '',
          permissionIds: roleToEdit.permissions.map((p: any) => p.id),
        });
      } else {
        reset({
          name: '',
          description: '',
          permissionIds: [],
        });
      }
      setError(null);
    }
  }, [isOpen, roleToEdit, reset]);

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/permissions');
      if (!res.ok) throw new Error('Failed to fetch permissions');
      const data = await res.json();
      setPermissionsByModule(data);
      
      // Open all modules by default
      const initialExpanded: Record<string, boolean> = {};
      Object.keys(data).forEach((mod) => {
        initialExpanded[mod] = true;
      });
      setExpandedModules(initialExpanded);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => ({ ...prev, [module]: !prev[module] }));
  };

  const togglePermission = (id: string) => {
    const current = [...selectedPermissionIds];
    const index = current.indexOf(id);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(id);
    }
    setValue('permissionIds', current, { shouldValidate: true });
  };

  const toggleModulePermissions = (module: string, modulePermIds: string[]) => {
    const allSelected = modulePermIds.every((id) => selectedPermissionIds.includes(id));
    
    let newSelected = [...selectedPermissionIds];
    if (allSelected) {
      // Remove all
      newSelected = newSelected.filter((id) => !modulePermIds.includes(id));
    } else {
      // Add all
      modulePermIds.forEach((id) => {
        if (!newSelected.includes(id)) newSelected.push(id);
      });
    }
    setValue('permissionIds', newSelected, { shouldValidate: true });
  };

  const onSubmit = async (data: RoleFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = roleToEdit ? `/api/roles/${roleToEdit.id}` : '/api/roles';
      const method = roleToEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || 'Something went wrong');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {roleToEdit ? 'Edit Role' : 'Create Role'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[80vh]">
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="mb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  {...register('name')}
                  disabled={roleToEdit?.isSystem}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="e.g. Store Manager"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
                {roleToEdit?.isSystem && (
                  <p className="mt-1 text-xs text-gray-500">System roles cannot be renamed.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Role description"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 border-b pb-2">
                Permissions *
              </label>
              {errors.permissionIds && (
                <p className="mb-2 text-xs text-red-500">{errors.permissionIds.message}</p>
              )}
              
              <div className="space-y-3">
                {Object.entries(permissionsByModule).map(([module, perms]) => {
                  const modulePermIds = perms.map((p) => p.id);
                  const isAllSelected = modulePermIds.every((id) => selectedPermissionIds.includes(id));
                  const isSomeSelected = modulePermIds.some((id) => selectedPermissionIds.includes(id)) && !isAllSelected;
                  const isExpanded = expandedModules[module];

                  return (
                    <div key={module} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 hover:bg-gray-100 transition-colors">
                        <div 
                          className="flex items-center cursor-pointer flex-1"
                          onClick={() => toggleModule(module)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500 mr-2" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500 mr-2" />
                          )}
                          <span className="font-medium text-sm text-gray-800 capitalize">
                            {module.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-900">
                            <span className="mr-2">Select All</span>
                            <div 
                              className={`flex h-4 w-4 items-center justify-center rounded border ${
                                isAllSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleModulePermissions(module, modulePermIds);
                              }}
                            >
                              {isAllSelected && <Check className="h-3 w-3 text-white" />}
                              {isSomeSelected && <div className="h-2 w-2 rounded-sm bg-blue-600" />}
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 bg-white border-t border-gray-100">
                          {perms.map((perm) => {
                            const isSelected = selectedPermissionIds.includes(perm.id);
                            return (
                              <label key={perm.id} className="flex items-center cursor-pointer group">
                                <div 
                                  className={`flex h-4 w-4 items-center justify-center rounded border mr-2 transition-colors ${
                                    isSelected 
                                      ? 'border-blue-600 bg-blue-600' 
                                      : 'border-gray-300 bg-white group-hover:border-blue-400'
                                  }`}
                                  onClick={() => togglePermission(perm.id)}
                                >
                                  {isSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-sm text-gray-600 capitalize">
                                  {perm.action}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
