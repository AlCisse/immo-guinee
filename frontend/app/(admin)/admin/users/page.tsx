'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import apiClient from '@/lib/api/client';
import { getStatusColor, getBadgeColor, roleLabels, badgeLabels } from '@/lib/colors';
import {
  Users,
  Search,
  Filter,
  Edit,
  Ban,
  CheckCircle,
  UserCheck,
  UserX,
  Shield,
  Crown,
  UserCog,
  Gavel,
  Loader2,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { ColoredStatsCard } from '@/components/ui/StatsCard';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface AdminUser {
  id: string;
  nom_complet: string;
  email: string;
  telephone: string;
  type_compte: string;
  roles: string[];
  is_admin: boolean;
  is_moderator: boolean;
  is_mediator: boolean;
  badge: string;
  statut_verification: string;
  is_active: boolean;
  is_suspended: boolean;
  listings_count: number;
  contracts_count: number;
  ratings_count: number;
  created_at: string;
  last_login_at: string | null;
}

interface Role {
  id: number;
  name: string;
  users_count: number;
}

const ROLE_INFO: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: 'Administrateur', icon: Crown, color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  moderator: { label: 'Modérateur', icon: Shield, color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  mediator: { label: 'Médiateur', icon: Gavel, color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
};

export default function UsersPage() {
  const [filters, setFilters] = useState<{
    search?: string;
    role?: string;
    verification?: string;
    badge?: string;
    page?: number;
  }>({});
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/users', { params: filters });
      return response.data;
    },
  });

  // Fetch available roles
  const { data: rolesData } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/roles');
      return response.data;
    },
  });

  const availableRoles: Role[] = rolesData?.data || [];

  const updateMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: string }) => {
      const response = await apiClient.post(`/admin/users/${userId}`, { action });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setSelectedUser(null);
      toast.success(data.message || 'Utilisateur mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    },
  });

  // Mutation to sync user roles
  const syncRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      const response = await apiClient.post(`/admin/users/${userId}/roles/sync`, { roles });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowRoleModal(false);
      setSelectedUser(null);
      toast.success('Rôles mis à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour des rôles');
    },
  });

  // Mutation to delete user
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.delete(`/admin/users/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setUserToDelete(null);
      toast.success('Utilisateur supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    },
  });

  // Handle delete confirmation
  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  // Open role modal with current user roles
  const openRoleModal = (user: AdminUser) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles || []);
    setShowRoleModal(true);
  };

  // Toggle role selection
  const toggleRole = (roleName: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  // Save roles
  const handleSaveRoles = () => {
    if (selectedUser) {
      syncRolesMutation.mutate({ userId: selectedUser.id, roles: selectedRoles });
    }
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setFilters({ ...filters, search: formData.get('search') as string, page: 1 });
  };

  const handleAction = (action: string) => {
    if (selectedUser) {
      updateMutation.mutate({ userId: selectedUser.id, action });
    }
  };

  const users = data?.data || [];
  const meta = data?.meta || { total: 0, last_page: 1, current_page: 1 };
  const verifiedCount = users.filter((u: AdminUser) => u.statut_verification === 'VERIFIE').length;
  const activeCount = users.filter((u: AdminUser) => u.statut_compte === 'ACTIF').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="w-7 h-7 text-primary-500" />
          Gestion des utilisateurs
        </h1>
        <p className="text-gray-600 mt-1">
          Gérez les comptes, badges et vérifications
        </p>
      </div>

      {/* Content */}
      <div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Stats Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ColoredStatsCard
                title="Total utilisateurs"
                value={meta.total}
                change={12}
                color="secondary"
              />
              <ColoredStatsCard
                title="Utilisateurs vérifiés"
                value={verifiedCount}
                change={8}
                color="success"
              />
              <ColoredStatsCard
                title="Comptes actifs"
                value={activeCount}
                change={5}
                color="purple"
              />
              <ColoredStatsCard
                title="Nouveaux ce mois"
                value={Math.floor(meta.total * 0.15)}
                change={18}
                color="pink"
              />
            </motion.div>

            {/* Search & Filters */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
            >
              <form onSubmit={handleSearch} className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    name="search"
                    placeholder="Rechercher par nom, email ou téléphone..."
                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
                >
                  Rechercher
                </button>
              </form>

              <div className="flex flex-wrap gap-4 items-center">
                <Filter className="w-5 h-5 text-neutral-400" />
                <select
                  value={filters.role || ''}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value || undefined, page: 1 })}
                  className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous les rôles</option>
                  <option value="PARTICULIER">Particulier</option>
                  <option value="PROPRIETAIRE">Propriétaire</option>
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>

                <select
                  value={filters.verification || ''}
                  onChange={(e) => setFilters({ ...filters, verification: e.target.value || undefined, page: 1 })}
                  className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Toute vérification</option>
                  <option value="VERIFIE">Vérifié</option>
                  <option value="NON_VERIFIE">Non vérifié</option>
                </select>

                <select
                  value={filters.badge || ''}
                  onChange={(e) => setFilters({ ...filters, badge: e.target.value || undefined, page: 1 })}
                  className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous les badges</option>
                  <option value="DEBUTANT">Débutant</option>
                  <option value="BRONZE">Bronze</option>
                  <option value="ARGENT">Argent</option>
                  <option value="OR">Or</option>
                  <option value="PLATINE">Platine</option>
                  <option value="AMBASSADEUR">Ambassadeur</option>
                </select>

                {(filters.role || filters.verification || filters.badge || filters.search) && (
                  <button
                    onClick={() => setFilters({})}
                    className="text-sm text-primary-500 hover:text-primary-600 font-medium"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            </motion.div>

            {/* Users Table */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
            >
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 dark:bg-dark-hover border-b border-neutral-200 dark:border-dark-border">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Utilisateur</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Rôles système</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Badge</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Activité</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
                        {users.map((user: AdminUser, index: number) => (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-500/10 rounded-xl flex items-center justify-center">
                                  <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-neutral-900 dark:text-white">{user.nom_complet}</div>
                                  <div className="text-sm text-neutral-500">{user.email || '-'}</div>
                                  <div className="text-sm text-neutral-400">{user.telephone}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                {roleLabels[user.type_compte] || user.type_compte}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {user.roles && user.roles.length > 0 ? (
                                  user.roles.map((role) => {
                                    const roleInfo = ROLE_INFO[role];
                                    if (!roleInfo) return null;
                                    const IconComponent = roleInfo.icon;
                                    return (
                                      <span
                                        key={role}
                                        className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full', roleInfo.color)}
                                      >
                                        <IconComponent className="w-3 h-3" />
                                        {roleInfo.label}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-xs text-neutral-400">Aucun</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={clsx('px-3 py-1 text-xs font-medium rounded-full', getBadgeColor(user.badge))}>
                                {badgeLabels[user.badge] || user.badge}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={clsx(
                                'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full',
                                user.is_suspended && !user.is_active
                                  ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                  : user.is_suspended
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                                  : user.is_active
                                  ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                              )}>
                                {user.is_suspended && !user.is_active ? (
                                  <><Ban className="w-3.5 h-3.5" /> Banni</>
                                ) : user.is_suspended ? (
                                  <><Ban className="w-3.5 h-3.5" /> Suspendu</>
                                ) : user.is_active ? (
                                  <><UserCheck className="w-3.5 h-3.5" /> Actif</>
                                ) : (
                                  <><UserX className="w-3.5 h-3.5" /> Inactif</>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-500">
                              <div>{user.listings_count} annonces</div>
                              <div>{user.contracts_count} contrats</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openRoleModal(user)}
                                  className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                                  title="Gérer les rôles"
                                >
                                  <UserCog className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setSelectedUser(user)}
                                  className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                                  title="Modifier le statut"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {!user.is_admin && (
                                  <button
                                    onClick={() => setUserToDelete(user)}
                                    className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                    title="Supprimer l'utilisateur"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {users.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                      <p className="text-neutral-500">Aucun utilisateur trouvé</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>

            {/* Pagination */}
            {meta.last_page > 1 && (
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between"
              >
                <p className="text-sm text-neutral-500">
                  Page {meta.current_page} sur {meta.last_page}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                    disabled={(filters.page || 1) <= 1}
                    className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                    disabled={(filters.page || 1) >= meta.last_page}
                    className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Suivant
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Edit Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-500" />
                  Informations utilisateur
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* User Info Header */}
              <div className="flex items-center gap-4 mb-4 p-4 bg-neutral-50 dark:bg-dark-hover rounded-xl">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-500/10 rounded-xl flex items-center justify-center">
                  <span className="text-primary-600 dark:text-primary-400 font-bold text-xl">
                    {selectedUser.nom_complet.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-neutral-900 dark:text-white">{selectedUser.nom_complet}</h4>
                  <p className="text-sm text-neutral-500">{selectedUser.type_compte}</p>
                </div>
              </div>

              {/* Statut actuel - bien visible */}
              <div className="mb-4 p-3 rounded-xl border-2 border-dashed border-neutral-200 dark:border-dark-border">
                <p className="text-xs text-neutral-500 mb-2 font-medium">STATUT ACTUEL</p>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'px-4 py-2 text-sm font-bold rounded-full',
                    selectedUser.is_suspended && !selectedUser.is_active
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                      : selectedUser.is_suspended
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                      : selectedUser.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                  )}>
                    {selectedUser.is_suspended && !selectedUser.is_active
                      ? 'BANNI'
                      : selectedUser.is_suspended
                      ? 'SUSPENDU'
                      : selectedUser.is_active
                      ? 'ACTIF'
                      : 'INACTIF'}
                  </span>
                </div>
              </div>

              {/* Informations détaillées */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-dark-border">
                  <span className="text-neutral-500">Téléphone</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.telephone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-dark-border">
                  <span className="text-neutral-500">Email</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.email || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-dark-border">
                  <span className="text-neutral-500">Badge</span>
                  <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', getBadgeColor(selectedUser.badge))}>
                    {badgeLabels[selectedUser.badge] || selectedUser.badge}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-100 dark:border-dark-border">
                  <span className="text-neutral-500">Inscrit le</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {new Date(selectedUser.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-500">Annonces</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{selectedUser.listings_count}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <p className="text-xs text-neutral-500 font-medium">ACTIONS</p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Activer - visible seulement si inactif */}
                  {!selectedUser.is_active && (
                    <button
                      onClick={() => handleAction('activate')}
                      disabled={updateMutation.isPending}
                      className="flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Activer
                    </button>
                  )}

                  {/* Désactiver - visible seulement si actif */}
                  {selectedUser.is_active && !selectedUser.is_suspended && (
                    <button
                      onClick={() => handleAction('deactivate')}
                      disabled={updateMutation.isPending}
                      className="flex items-center justify-center gap-2 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                      Désactiver
                    </button>
                  )}

                  {/* Suspendre - visible seulement si pas suspendu */}
                  {!selectedUser.is_suspended && (
                    <button
                      onClick={() => handleAction('suspend')}
                      disabled={updateMutation.isPending}
                      className="flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                      Suspendre
                    </button>
                  )}

                  {/* Lever suspension - visible seulement si suspendu */}
                  {selectedUser.is_suspended && (
                    <button
                      onClick={() => handleAction('unsuspend')}
                      disabled={updateMutation.isPending}
                      className="flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                      Lever susp.
                    </button>
                  )}

                  {/* Bannir - visible seulement si pas banni */}
                  {!(selectedUser.is_suspended && !selectedUser.is_active) && (
                    <button
                      onClick={() => {
                        if (confirm('Voulez-vous vraiment bannir cet utilisateur ?')) {
                          handleAction('ban');
                        }
                      }}
                      disabled={updateMutation.isPending}
                      className="flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition-colors text-sm font-medium"
                    >
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                      Bannir
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-dark-border">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2.5 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-medium"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Role Management Modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-purple-500" />
                  Gérer les rôles
                </h3>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-neutral-700 dark:text-neutral-300 font-medium">{selectedUser.nom_complet}</p>
                <p className="text-sm text-neutral-500">{selectedUser.email || selectedUser.telephone}</p>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Sélectionnez les rôles :</p>

                {/* Admin Role */}
                <button
                  onClick={() => toggleRole('admin')}
                  className={clsx(
                    'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                    selectedRoles.includes('admin')
                      ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                      : 'border-neutral-200 dark:border-dark-border hover:border-red-300 dark:hover:border-red-500/30'
                  )}
                >
                  <div className={clsx(
                    'p-2 rounded-lg',
                    selectedRoles.includes('admin')
                      ? 'bg-red-100 dark:bg-red-500/20'
                      : 'bg-neutral-100 dark:bg-dark-hover'
                  )}>
                    <Crown className={clsx(
                      'w-5 h-5',
                      selectedRoles.includes('admin')
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-neutral-500'
                    )} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={clsx(
                      'font-medium',
                      selectedRoles.includes('admin')
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                    )}>Administrateur</p>
                    <p className="text-xs text-neutral-500">Accès complet à toutes les fonctionnalités</p>
                  </div>
                  <div className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    selectedRoles.includes('admin')
                      ? 'border-red-500 bg-red-500'
                      : 'border-neutral-300 dark:border-neutral-600'
                  )}>
                    {selectedRoles.includes('admin') && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                </button>

                {/* Moderator Role */}
                <button
                  onClick={() => toggleRole('moderator')}
                  className={clsx(
                    'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                    selectedRoles.includes('moderator')
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-neutral-200 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-500/30'
                  )}
                >
                  <div className={clsx(
                    'p-2 rounded-lg',
                    selectedRoles.includes('moderator')
                      ? 'bg-blue-100 dark:bg-blue-500/20'
                      : 'bg-neutral-100 dark:bg-dark-hover'
                  )}>
                    <Shield className={clsx(
                      'w-5 h-5',
                      selectedRoles.includes('moderator')
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-neutral-500'
                    )} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={clsx(
                      'font-medium',
                      selectedRoles.includes('moderator')
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                    )}>Modérateur</p>
                    <p className="text-xs text-neutral-500">Modération des annonces et utilisateurs</p>
                  </div>
                  <div className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    selectedRoles.includes('moderator')
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-neutral-300 dark:border-neutral-600'
                  )}>
                    {selectedRoles.includes('moderator') && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                </button>

                {/* Mediator Role */}
                <button
                  onClick={() => toggleRole('mediator')}
                  className={clsx(
                    'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all',
                    selectedRoles.includes('mediator')
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
                      : 'border-neutral-200 dark:border-dark-border hover:border-purple-300 dark:hover:border-purple-500/30'
                  )}
                >
                  <div className={clsx(
                    'p-2 rounded-lg',
                    selectedRoles.includes('mediator')
                      ? 'bg-purple-100 dark:bg-purple-500/20'
                      : 'bg-neutral-100 dark:bg-dark-hover'
                  )}>
                    <Gavel className={clsx(
                      'w-5 h-5',
                      selectedRoles.includes('mediator')
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-neutral-500'
                    )} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={clsx(
                      'font-medium',
                      selectedRoles.includes('mediator')
                        ? 'text-purple-700 dark:text-purple-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                    )}>Médiateur</p>
                    <p className="text-xs text-neutral-500">Gestion des litiges entre utilisateurs</p>
                  </div>
                  <div className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    selectedRoles.includes('mediator')
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-neutral-300 dark:border-neutral-600'
                  )}>
                    {selectedRoles.includes('mediator') && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 py-2.5 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveRoles}
                  disabled={syncRolesMutation.isPending}
                  className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {syncRolesMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white text-center mb-2">
                Confirmer la suppression
              </h3>

              <p className="text-neutral-600 dark:text-neutral-400 text-center mb-4">
                Êtes-vous sûr de vouloir supprimer l&apos;utilisateur{' '}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {userToDelete.nom_complet}
                </span>{' '}
                ?
              </p>

              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Cette action est réversible. L&apos;utilisateur sera désactivé et pourra être restauré ultérieurement depuis la corbeille.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2.5 bg-neutral-100 dark:bg-dark-hover text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
    </div>
  );
}
