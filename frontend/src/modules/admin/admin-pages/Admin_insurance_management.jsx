import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Plus, 
  FileText, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  MoreVertical,
  Calendar,
  IndianRupee,
  CheckCircle,
  X,
  ChevronRight
} from 'lucide-react';
import DashboardHeader from '../admin-components/DashboardHeader';
import Admin_navbar from '../admin-components/Admin_navbar';
import Admin_sidebar from '../admin-components/Admin_sidebar';
import MetricCard from '../admin-components/MetricCard';
import adminInsuranceService from '../admin-services/adminInsuranceService';
import { adminProjectService } from '../admin-services/adminProjectService';
import { adminUserService } from '../admin-services/adminUserService';
import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Combobox } from '../../../components/ui/combobox';
import Loading from '../../../components/ui/loading';

const Admin_insurance_management = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalPolicies: 0,
    activePolicies: 0,
    expiredPolicies: 0,
    upcomingRenewals: 0,
    totalProducts: 0
  });
  const [products, setProducts] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'products', 'renewals'
  
  // Selection options
  const [clientOptions, setClientOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    product: 'all'
  });

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteType, setDeleteType] = useState('policy'); // 'policy' or 'product'

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    type: 'Health',
    code: '',
    provider: '',
    premiumRange: { min: 0, max: 0 },
    coverAmount: 0,
    validityMonths: 12,
    description: '',
    isActive: true
  });

  const [policyForm, setPolicyForm] = useState({
    policyNumber: '',
    product: '',
    client: '',
    premiumAmount: 0,
    coverAmount: 0,
    startDate: '',
    endDate: '',
    status: 'active',
    notes: ''
  });

  const fetchStats = async () => {
    try {
      const res = await adminInsuranceService.getStats();
      if (res.success) setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await adminInsuranceService.getProducts();
      if (res.success) {
        setProducts(res.data);
        setProductOptions(res.data.map(p => ({ label: `${p.name} (${p.provider})`, value: p._id })));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchPolicies = async () => {
    try {
      const params = {
        ...filters,
        isUpcomingRenewal: activeTab === 'renewals' ? 'true' : undefined
      };
      const res = await adminInsuranceService.getPolicies(params);
      if (res.success) setPolicies(res.data);
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  };

  const fetchClients = async () => {
    try {
      // Use project service as it has a optimized client fetcher
      const res = await adminProjectService.getClients({ limit: 1000 });
      if (res.success) {
        setClientOptions(res.data.map(c => ({ 
          label: `${c.name} (${c.companyName || 'Individual'})`, 
          value: c._id || c.id 
        })));
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchProducts(),
      fetchPolicies(),
      fetchClients()
    ]);
    setLoading(false);
  }, [filters, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleAddProduct = () => {
    setModalMode('add');
    setProductForm({
      name: '',
      type: 'Health',
      code: '',
      provider: '',
      premiumRange: { min: 0, max: 0 },
      coverAmount: 0,
      validityMonths: 12,
      description: '',
      isActive: true
    });
    setShowProductModal(true);
  };

  const handleEditProduct = (product) => {
    setModalMode('edit');
    setSelectedItem(product);
    setProductForm({
      name: product.name,
      type: product.type,
      code: product.code,
      provider: product.provider,
      premiumRange: product.premiumRange || { min: 0, max: 0 },
      coverAmount: product.coverAmount,
      validityMonths: product.validityMonths,
      description: product.description,
      isActive: product.isActive
    });
    setShowProductModal(true);
  };

  const handleAddPolicy = () => {
    setModalMode('add');
    setPolicyForm({
      policyNumber: '',
      product: '',
      client: '',
      premiumAmount: 0,
      coverAmount: 0,
      startDate: '',
      endDate: '',
      status: 'active',
      notes: ''
    });
    setShowPolicyModal(true);
  };

  const handleEditPolicy = (policy) => {
    setModalMode('edit');
    setSelectedItem(policy);
    setPolicyForm({
      policyNumber: policy.policyNumber,
      product: policy.product?._id || policy.product,
      client: policy.client?._id || policy.client,
      premiumAmount: policy.premiumAmount,
      coverAmount: policy.coverAmount,
      startDate: policy.startDate ? new Date(policy.startDate).toISOString().split('T')[0] : '',
      endDate: policy.endDate ? new Date(policy.endDate).toISOString().split('T')[0] : '',
      status: policy.status,
      notes: policy.notes || ''
    });
    setShowPolicyModal(true);
  };

  const handleDeleteClick = (item, type) => {
    setSelectedItem(item);
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setBtnLoading(true);
    try {
      let res;
      if (deleteType === 'policy') {
        res = await adminInsuranceService.deletePolicy(selectedItem._id);
      } else {
        res = await adminInsuranceService.deleteProduct(selectedItem._id);
      }

      if (res.success) {
        toast.success(`${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)} deleted successfully`);
        fetchData();
        setShowDeleteModal(false);
      } else {
        toast.error(res.message || 'Delete failed');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setBtnLoading(false);
    }
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    setBtnLoading(true);
    try {
      const res = modalMode === 'add' 
        ? await adminInsuranceService.createProduct(productForm)
        : await adminInsuranceService.updateProduct(selectedItem._id, productForm);

      if (res.success) {
        toast.success(`Product ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
        setShowProductModal(false);
        fetchData();
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setBtnLoading(false);
    }
  };

  const submitPolicy = async (e) => {
    e.preventDefault();
    setBtnLoading(true);
    try {
      const res = modalMode === 'add'
        ? await adminInsuranceService.createPolicy(policyForm)
        : await adminInsuranceService.updatePolicy(selectedItem._id, policyForm);

      if (res.success) {
        toast.success(`Policy ${modalMode === 'add' ? 'created' : 'updated'} successfully`);
        setShowPolicyModal(false);
        fetchData();
      } else {
        toast.error(res.message || 'Operation failed');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setBtnLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Admin_navbar />
      <Admin_sidebar />

      <div className="ml-0 lg:ml-64 pt-16 lg:pt-20 p-4 lg:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Shield className="h-7 w-7 text-teal-600" />
                Insurance Management
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1">
                Centralized hub for insurance products and policy administration
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="bg-white border-gray-200"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button
                size="sm"
                onClick={activeTab === 'products' ? handleAddProduct : handleAddPolicy}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === 'products' ? 'New Product' : 'New Policy'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Policies" value={stats.totalPolicies} icon={FileText} color="blue" />
            <MetricCard title="Active Policies" value={stats.activePolicies} icon={Shield} color="teal" />
            <MetricCard title="Expired Policies" value={stats.expiredPolicies} icon={AlertTriangle} color="red" />
            <MetricCard title="Upcoming Renewals" value={stats.upcomingRenewals} icon={RefreshCw} color="yellow" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/30">
              <div className="flex px-2">
                {[
                  { id: 'overview', label: 'All Policies', icon: Shield },
                  { id: 'renewals', label: 'Upcoming Renewals', icon: RefreshCw },
                  { id: 'products', label: 'Products Catalog', icon: FileText }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all ${
                      activeTab === tab.id
                        ? 'border-teal-500 text-teal-600 bg-white'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 lg:p-6">
              {/* Filter Bar */}
              {(activeTab === 'overview' || activeTab === 'renewals') && (
                <div className="flex flex-col lg:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search policy #, client name..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                    />
                  </div>
                  <div className="flex gap-4">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="pending">Pending</option>
                      <option value="renewed">Renewed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <select
                      value={filters.product}
                      onChange={(e) => setFilters({ ...filters, product: e.target.value })}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="all">All Products</option>
                      {products.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loading />
                </div>
              ) : activeTab === 'overview' || activeTab === 'renewals' ? (
                <div>
                  {policies.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="pb-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Policy Detail</th>
                            <th className="pb-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Client</th>
                            <th className="pb-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Product</th>
                            <th className="pb-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Dates</th>
                            <th className="pb-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="pb-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {policies.map((policy) => (
                            <tr key={policy._id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="py-4 px-4">
                                <div className="font-bold text-gray-900">#{policy.policyNumber}</div>
                                <div className="text-xs text-gray-400 font-medium">Added {new Date(policy.createdAt).toLocaleDateString()}</div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-xs">
                                    {policy.client?.name?.charAt(0) || 'C'}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-gray-900">{policy.client?.name || 'N/A'}</div>
                                    <div className="text-xs text-gray-500">{policy.client?.companyName || 'Individual'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">
                                  <FileText className="w-3 h-3" />
                                  {policy.product?.name || 'N/A'}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    {new Date(policy.startDate).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                                    <RefreshCw className="w-3 h-3 text-red-400" />
                                    Ends {new Date(policy.endDate).toLocaleDateString()}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize shadow-sm ${
                                  policy.status === 'active' ? 'bg-green-100 text-green-700' :
                                  policy.status === 'expired' ? 'bg-red-100 text-red-700' :
                                  policy.status === 'renewed' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {policy.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {policy.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleEditPolicy(policy)}
                                    className="h-8 w-8 text-gray-400 hover:text-teal-600 hover:bg-teal-50"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteClick(policy, 'policy')}
                                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                      <Shield className="mx-auto h-12 w-12 text-gray-300" />
                      <h3 className="mt-4 font-bold text-gray-900">No policies found</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {activeTab === 'renewals' ? 'Great news! No policies are currently up for renewal.' : 'Start protecting clients by issuing their first insurance policy.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.length > 0 ? products.map(product => (
                    <Card key={product._id} className="group hover:shadow-xl hover:border-teal-200 transition-all duration-300 rounded-2xl overflow-hidden border-gray-100">
                      <CardContent className="p-0">
                        <div className="p-5 border-b border-gray-50">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-teal-50 rounded-xl">
                              <Shield className="w-6 h-6 text-teal-600" />
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} className="h-8 w-8 text-gray-400 hover:text-teal-600 group-hover:bg-teal-50">
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(product, 'product')} className="h-8 w-8 text-gray-400 hover:text-red-600 group-hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 mb-1">{product.name}</h4>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{product.provider}</p>
                        </div>
                        <div className="p-5 bg-gray-50/30 space-y-4">
                          <div className="flex flex-wrap gap-2">
                             <span className="px-2.5 py-1 bg-white border border-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-lg shadow-sm">
                               {product.type}
                             </span>
                             <span className="px-2.5 py-1 bg-white border border-gray-100 text-teal-600 text-[10px] font-black uppercase rounded-lg shadow-sm">
                               {product.code}
                             </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                               <span className="font-bold text-gray-400">Premium Range</span>
                               <span className="font-black text-gray-900">₹{product.premiumRange?.min} - ₹{product.premiumRange?.max}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                               <span className="font-bold text-gray-400">Validity</span>
                               <span className="font-black text-gray-900">{product.validityMonths} Months</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <div className="col-span-full text-center py-16 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                      <FileText className="mx-auto h-12 w-12 text-gray-300" />
                      <h3 className="mt-4 font-bold text-gray-900">Product catalog is empty</h3>
                      <p className="mt-2 text-sm text-gray-500">Define your insurance products to start issuing policies.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-teal-600">
              <h2 className="text-xl font-black text-white">{modalMode === 'add' ? 'Create New Product' : 'Edit Product'}</h2>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitProduct} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Product Name</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-bold"
                    placeholder="e.g. Family Health Gold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Provider Name</label>
                  <input
                    type="text"
                    required
                    value={productForm.provider}
                    onChange={(e) => setProductForm({ ...productForm, provider: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-bold"
                    placeholder="e.g. Star Health"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Category Type</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-bold cursor-pointer"
                  >
                    <option value="Health">Health Insurance</option>
                    <option value="Life">Life Insurance</option>
                    <option value="Motor">Motor Insurance</option>
                    <option value="General">General Insurance</option>
                    <option value="Travel">Travel Insurance</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Product Code</label>
                  <input
                    type="text"
                    required
                    value={productForm.code}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all font-bold font-mono uppercase"
                    placeholder="HLTH-001"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Premium Range</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="Min"
                      value={productForm.premiumRange.min}
                      onChange={(e) => setProductForm({ ...productForm, premiumRange: { ...productForm.premiumRange, min: Number(e.target.value) } })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold"
                    />
                    <span className="text-gray-300">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={productForm.premiumRange.max}
                      onChange={(e) => setProductForm({ ...productForm, premiumRange: { ...productForm.premiumRange, max: Number(e.target.value) } })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Max Cover (₹)</label>
                  <input
                    type="number"
                    value={productForm.coverAmount}
                    onChange={(e) => setProductForm({ ...productForm, coverAmount: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold"
                    placeholder="500000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold min-h-[100px]"
                  placeholder="Detailed benefits and features..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" type="button" onClick={() => setShowProductModal(false)} className="font-bold">Cancel</Button>
                <Button type="submit" disabled={btnLoading} className="bg-teal-600 hover:bg-teal-700 text-white font-black px-8">
                  {btnLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (modalMode === 'add' ? 'Create Product' : 'Save Changes')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-teal-600">
              <h2 className="text-xl font-black text-white">{modalMode === 'add' ? 'Issue New Policy' : 'Edit Policy Detials'}</h2>
              <button onClick={() => setShowPolicyModal(false)} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitPolicy} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Policy Number</label>
                  <input
                    type="text"
                    required
                    value={policyForm.policyNumber}
                    onChange={(e) => setPolicyForm({ ...policyForm, policyNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold"
                    placeholder="POL-123456"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Product</label>
                  <Combobox
                    options={productOptions}
                    value={policyForm.product}
                    onChange={(val) => setPolicyForm({ ...policyForm, product: val })}
                    placeholder="Search insurance product..."
                    searchable={true}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Assign to Client</label>
                  <Combobox
                    options={clientOptions}
                    value={policyForm.client}
                    onChange={(val) => setPolicyForm({ ...policyForm, client: val })}
                    placeholder="Search client account..."
                    searchable={true}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Premium (₹)</label>
                  <input
                    type="number"
                    required
                    value={policyForm.premiumAmount}
                    onChange={(e) => setPolicyForm({ ...policyForm, premiumAmount: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold"
                  />
                </div>
                <div className="space-y-2 text-xs font-black text-gray-400">
                  <label className="uppercase tracking-widest block mb-2">Start Date</label>
                  <input
                    type="date"
                    required
                    value={policyForm.startDate}
                    onChange={(e) => setPolicyForm({ ...policyForm, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold"
                  />
                </div>
                <div className="space-y-2 text-xs font-black text-gray-400">
                  <label className="uppercase tracking-widest block mb-2">End Date (Expiry)</label>
                  <input
                    type="date"
                    required
                    value={policyForm.endDate}
                    onChange={(e) => setPolicyForm({ ...policyForm, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold border-red-100 bg-red-50/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Policy Notes</label>
                <textarea
                  value={policyForm.notes}
                  onChange={(e) => setPolicyForm({ ...policyForm, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold min-h-[80px]"
                  placeholder="Additional terms or custom conditions..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" type="button" onClick={() => setShowPolicyModal(false)} className="font-bold">Cancel</Button>
                <Button type="submit" disabled={btnLoading} className="bg-teal-600 hover:bg-teal-700 text-white font-black px-8">
                  {btnLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (modalMode === 'add' ? 'Issue Policy' : 'Update Policy')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="h-20 w-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900">Are you sure?</h3>
                <p className="text-gray-500 font-medium px-4">
                  This action will permanently delete the <strong>{deleteType} #{selectedItem?.policyNumber || selectedItem?.name}</strong>. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1 font-bold py-6 rounded-2xl border-gray-200">
                  Keep it
                </Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={btnLoading} className="flex-1 font-black py-6 rounded-2xl bg-red-600 hover:bg-red-700">
                  {btnLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Yes, Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin_insurance_management;
