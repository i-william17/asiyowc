import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/layout/AdminLayout";

import {
    fetchEntities,
    fetchMarketplaceOverview,
    fetchEntityById,
    createEntity,
    updateEntity,
    deleteEntity,
    setMarketplaceFilters,
    clearSelectedEntity,
} from "../../store/slices/marketplaceSlice";

import {
    RefreshCw,
    Search,
    Eye,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    Package,
    Briefcase,
    Award,
    DollarSign,
    ShoppingCart,
    CreditCard,
    Plus,
    Edit,
    Save,
    MapPin,
    Tag,
    Star,
    Users,
    Calendar,
    Clock,
    Mail,
    Phone,
    Globe,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Image as ImageIcon,
    Link,
    DollarSign as CurrencyIcon,
    Building,
    User,
    Briefcase as WorkIcon,
    GraduationCap,
    Heart,
    Eye as ViewIcon,
    MessageCircle,
    ThumbsUp,
    Shield,
    Lock,
    Target,
} from "lucide-react";

/* ============================================================
   Helpers
============================================================ */

function formatDate(dt) {
    try {
        return new Date(dt).toLocaleString("en-KE", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "";
    }
}

function formatKES(n) {
    if (!n && n !== 0) return "Ksh 0";
    return `Ksh ${Number(n).toLocaleString()}`;
}

function formatCurrency(amount, currency = "KES") {
    if (!amount && amount !== 0) return "—";
    return `${currency} ${Number(amount).toLocaleString()}`;
}

function getStatusColor(status) {
    const colors = {
        active: "bg-emerald-100 text-emerald-800 border-emerald-200",
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        completed: "bg-blue-100 text-blue-800 border-blue-200",
        cancelled: "bg-rose-100 text-rose-800 border-rose-200",
        sold: "bg-purple-100 text-purple-800 border-purple-200",
        hidden: "bg-gray-100 text-gray-800 border-gray-200",
        expired: "bg-orange-100 text-orange-800 border-orange-200",
        filled: "bg-indigo-100 text-indigo-800 border-indigo-200",
        closed: "bg-gray-100 text-gray-800 border-gray-200",
        open: "bg-emerald-100 text-emerald-800 border-emerald-200",
        coming_soon: "bg-purple-100 text-purple-800 border-purple-200",
        available: "bg-emerald-100 text-emerald-800 border-emerald-200",
        busy: "bg-yellow-100 text-yellow-800 border-yellow-200",
        unavailable: "bg-gray-100 text-gray-800 border-gray-200",
        paused: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

const ENTITY_OPTIONS = [
    { value: "products", label: "Products", icon: Package, creatable: true, deletable: true },
    { value: "jobs", label: "Jobs", icon: Briefcase, creatable: true, deletable: true },
    { value: "funding", label: "Funding", icon: Award, creatable: true, deletable: true },
    { value: "skills", label: "Skills", icon: DollarSign, creatable: true, deletable: true },
    { value: "orders", label: "Orders", icon: ShoppingCart, creatable: false, deletable: false },
    { value: "intents", label: "Payment Intents", icon: CreditCard, creatable: false, deletable: false },
];

/* ============================================================
   Detail Field Components
============================================================ */

function DetailSection({ title, children }) {
    return (
        <div className="mb-6">
            <h4 className="text-sm font-semibold text-black mb-3 pb-2 border-b">{title}</h4>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}

function DetailRow({ icon: Icon, label, value }) {
    if (value === undefined || value === null || value === "") return null;

    return (
        <div className="flex items-start gap-3 py-2">
            {Icon && <Icon size={18} className="text-black mt-0.5 flex-shrink-0" />}
            <div className="flex-1">
                <p className="text-xs text-black/60 mb-1">{label}</p>
                <p className="text-sm text-black break-words">
                    {typeof value === "boolean"
                        ? value ? "Yes" : "No"
                        : React.isValidElement(value)
                            ? value
                            : String(value)}
                </p>
            </div>
        </div>
    );
}

function DetailBadge({ label, value, color }) {
    if (!value) return null;

    return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border" style={{ backgroundColor: color + '10', borderColor: color + '30', color: color }}>
            {value}
        </div>
    );
}

function DetailArray({ icon: Icon, label, items }) {
    if (!items || items.length === 0) return null;

    return (
        <div className="flex items-start gap-3 py-2">
            {Icon && <Icon size={18} className="text-black mt-0.5 flex-shrink-0" />}
            <div className="flex-1">
                <p className="text-xs text-black/60 mb-2">{label}</p>
                <div className="flex flex-wrap gap-2">
                    {items.map((item, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-black">
                            {item}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DetailImages({ images }) {
    if (!images || images.length === 0) return null;

    return (
        <div className="py-2">
            <p className="text-xs text-black/60 mb-2">Images</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                    <img
                        key={index}
                        src={img}
                        alt={`Product ${index + 1}`}
                        className="w-20 h-20 rounded-lg border object-cover"
                    />
                ))}
            </div>
        </div>
    );
}

/* ============================================================
   Edit Form Components
============================================================ */

function FormField({ label, children, required }) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-black mb-1">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {children}
        </div>
    );
}

function FormInput({ value, onChange, placeholder, type = "text", required, disabled }) {
    return (
        <input
            type={type}
            value={value || ""}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className="w-full px-3 py-2 border rounded-lg text-black bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        />
    );
}

function FormTextarea({ value, onChange, placeholder, rows = 4, required, disabled }) {
    return (
        <textarea
            value={value || ""}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            required={required}
            disabled={disabled}
            className="w-full px-3 py-2 border rounded-lg text-black bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        />
    );
}

function FormSelect({ value, onChange, options, required, disabled }) {
    return (
        <select
            value={value || ""}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className="w-full px-3 py-2 border rounded-lg text-black bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        >
            <option value="">Select...</option>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

function FormArray({ values, onChange, placeholder, addLabel }) {
    const [inputValue, setInputValue] = useState("");

    const handleAdd = () => {
        if (inputValue.trim()) {
            onChange([...(values || []), inputValue.trim()]);
            setInputValue("");
        }
    };

    const handleRemove = (index) => {
        onChange((values || []).filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 border rounded-lg text-black bg-white"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                    Add
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {(values || []).map((item, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
                        <span className="text-sm text-black">{item}</span>
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="text-rose-500 hover:text-rose-700"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ============================================================
   Main Component
============================================================ */

export default function Marketplace() {
    const dispatch = useDispatch();

    const {
        entities,
        entitiesLoading,
        selectedEntity,
        selectedLoading,
        pagination,
        filters,
    } = useSelector((s) => s.marketplace);

    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});

    const currentEntity = ENTITY_OPTIONS.find(opt => opt.value === filters.entity) || ENTITY_OPTIONS[0];

    /* ============================================================
       Fetch
    ============================================================= */
    useEffect(() => {
        dispatch(fetchMarketplaceOverview());
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchEntities());
    }, [dispatch, filters]);

    /* ============================================================
       Form Data Sync
    ============================================================= */
    useEffect(() => {
        if (selectedEntity) {
            setFormData(selectedEntity);
        }
    }, [selectedEntity]);

    useEffect(() => {
        console.log("Entity:", filters.entity);
        console.log("Entities:", entities);
    }, [entities]);


    /* ============================================================
       Handlers
    ============================================================= */

    const openCreateModal = () => {
        setEditMode(true);
        setModalOpen(true);
        setFormData({});
    };

    const openDetail = async (id) => {
        await dispatch(fetchEntityById({ entity: filters.entity, id }));
        setEditMode(false);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditMode(false);
        dispatch(clearSelectedEntity());
        setFormData({});
    };

    const handleDelete = async (id) => {
        if (!currentEntity.deletable) return;

        const yes = window.confirm("Delete this item? This action cannot be undone.");
        if (!yes) return;

        try {
            await dispatch(deleteEntity({ entity: filters.entity, id })).unwrap();
            dispatch(fetchEntities());
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete item: " + error.message);
        }
    };

    const handleSave = async () => {
        try {
            if (!selectedEntity?._id) {
                // Create new
                await dispatch(
                    createEntity({
                        entity: filters.entity,
                        payload: formData,
                    })
                ).unwrap();
            } else {
                // Update existing
                await dispatch(
                    updateEntity({
                        entity: filters.entity,
                        id: selectedEntity._id,
                        payload: formData,
                    })
                ).unwrap();
            }

            setEditMode(false);
            dispatch(fetchEntities());

            // Refresh the selected entity if we're in detail view
            if (selectedEntity?._id) {
                dispatch(fetchEntityById({ entity: filters.entity, id: selectedEntity._id }));
            }
        } catch (error) {
            console.error("Save failed:", error);
            alert("Failed to save: " + error.message);
        }
    };

    const goPage = (p) => {
        dispatch(setMarketplaceFilters({ page: p }));
    };

    /* ============================================================
       Render Entity Details
    ============================================================= */
    const renderProductDetails = () => {
        const product = selectedEntity;
        return (
            <>
                <DetailSection title="Basic Information">
                    <DetailRow icon={Package} label="Title" value={product.title} />
                    <DetailRow icon={FileText} label="Description" value={product.description} />
                    <DetailRow icon={Tag} label="Category" value={product.category} />
                    <DetailRow icon={CurrencyIcon} label="Price" value={formatKES(product.price)} />
                    <DetailRow icon={MapPin} label="Location" value={product.location} />
                    <DetailRow icon={Package} label="Condition" value={product.condition} />
                    <DetailRow icon={Package} label="Quantity" value={product.quantity} />
                </DetailSection>

                <DetailSection title="Seller Information">
                    <DetailRow icon={User} label="Seller Name" value={product.sellerName} />
                    <DetailRow icon={Building} label="Seller ID" value={product.seller} />
                </DetailSection>

                {product.images && product.images.length > 0 && (
                    <DetailSection title="Images">
                        <DetailImages images={product.images} />
                    </DetailSection>
                )}

                <DetailSection title="Tags & Metadata">
                    <DetailArray icon={Tag} label="Tags" items={product.tags} />
                    <DetailRow icon={Star} label="Rating" value={product.rating?.average ? `${product.rating.average} (${product.rating.count} reviews)` : null} />
                    <DetailRow icon={Heart} label="Favorites" value={product.favoritesCount} />
                    <DetailRow icon={ViewIcon} label="Views" value={product.views} />
                </DetailSection>

                <DetailSection title="Status & Dates">
                    <DetailRow
                        icon={AlertCircle}
                        label="Status"
                        value={
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(product.status)}`}>
                                {product.status}
                            </span>
                        }
                    />
                    <DetailRow icon={Calendar} label="Created" value={formatDate(product.createdAt)} />
                    <DetailRow icon={Clock} label="Updated" value={formatDate(product.updatedAt)} />
                </DetailSection>
            </>
        );
    };

    const renderJobDetails = () => {
        const job = selectedEntity;
        return (
            <>
                <DetailSection title="Basic Information">
                    <DetailRow icon={Briefcase} label="Title" value={job.title} />
                    <DetailRow icon={Building} label="Company" value={job.company} />
                    <DetailRow icon={FileText} label="Description" value={job.description} />
                    <DetailRow icon={Tag} label="Category" value={job.category} />
                    <DetailRow icon={WorkIcon} label="Type" value={job.type} />
                    <DetailRow icon={MapPin} label="Location" value={job.location} />
                    <DetailRow icon={Globe} label="Remote" value={job.isRemote ? "Yes" : "No"} />
                    <DetailRow icon={CurrencyIcon} label="Salary" value={job.salary} />
                </DetailSection>

                <DetailSection title="Requirements">
                    <DetailArray icon={GraduationCap} label="Skills" items={job.skills} />
                    <DetailArray icon={FileText} label="Requirements" items={job.requirements} />
                    <DetailRow icon={WorkIcon} label="Experience Level" value={job.experienceLevel} />
                </DetailSection>

                <DetailSection title="Company Information">
                    <DetailRow icon={User} label="Posted By" value={job.postedBy} />
                    <DetailRow icon={Mail} label="Contact Email" value={job.contactEmail} />
                    <DetailRow icon={Building} label="Company ID" value={job.companyId} />
                </DetailSection>

                <DetailSection title="Tags & Metadata">
                    <DetailArray icon={Tag} label="Tags" items={job.tags} />
                    <DetailRow icon={Users} label="Applications" value={job.applicationCount} />
                    <DetailRow icon={ViewIcon} label="Views" value={job.views} />
                </DetailSection>

                <DetailSection title="Status & Dates">
                    <DetailRow
                        icon={AlertCircle}
                        label="Status"
                        value={
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(job.status)}`}>
                                {job.status}
                            </span>
                        }
                    />
                    <DetailRow icon={Calendar} label="Posted" value={job.posted} />
                    <DetailRow icon={Clock} label="Deadline" value={job.applicationDeadline ? formatDate(job.applicationDeadline) : null} />
                    <DetailRow icon={Calendar} label="Created" value={formatDate(job.createdAt)} />
                    <DetailRow icon={Clock} label="Updated" value={formatDate(job.updatedAt)} />
                </DetailSection>
            </>
        );
    };

    const renderFundingDetails = () => {
        const funding = selectedEntity;
        return (
            <>
                <DetailSection title="Basic Information">
                    <DetailRow icon={Award} label="Title" value={funding.title} />
                    <DetailRow icon={Building} label="Provider" value={funding.provider} />
                    <DetailRow icon={FileText} label="Description" value={funding.description} />
                    <DetailRow icon={Tag} label="Category" value={funding.category} />
                    <DetailRow icon={WorkIcon} label="Type" value={funding.type} />
                    <DetailRow icon={CurrencyIcon} label="Amount" value={funding.amount} />
                </DetailSection>

                <DetailSection title="Eligibility & Requirements">
                    <DetailRow icon={FileText} label="Eligibility" value={funding.eligibility} />
                    <DetailArray icon={FileText} label="Requirements" items={funding.requirements} />
                    <DetailArray icon={Target} label="Focus Areas" items={funding.focusAreas} />
                    <DetailArray icon={FileText} label="Application Process" items={funding.applicationProcess} />
                </DetailSection>

                <DetailSection title="Provider Information">
                    <DetailRow icon={User} label="Provider ID" value={funding.providerId} />
                    <DetailRow icon={Mail} label="Contact Email" value={funding.contactEmail} />
                    <DetailRow icon={Globe} label="Website" value={funding.website} />
                    <DetailRow icon={Shield} label="Verified" value={funding.isVerified ? "Yes" : "No"} />
                </DetailSection>

                <DetailSection title="Tags & Metadata">
                    <DetailArray icon={Tag} label="Tags" items={funding.tags} />
                    <DetailRow icon={Users} label="Applications" value={funding.applicationCount} />
                    <DetailRow icon={Award} label="Awarded" value={funding.awardedCount} />
                    <DetailRow icon={Heart} label="Favorites" value={funding.favoritesCount} />
                    <DetailRow icon={ViewIcon} label="Views" value={funding.views} />
                </DetailSection>

                <DetailSection title="Status & Dates">
                    <DetailRow
                        icon={AlertCircle}
                        label="Status"
                        value={
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(funding.status)}`}>
                                {funding.status}
                            </span>
                        }
                    />
                    <DetailRow icon={Clock} label="Time Left" value={funding.timeLeft} />
                    <DetailRow icon={Calendar} label="Deadline" value={formatDate(funding.deadline)} />
                    <DetailRow icon={Calendar} label="Created" value={formatDate(funding.createdAt)} />
                    <DetailRow icon={Clock} label="Updated" value={formatDate(funding.updatedAt)} />
                </DetailSection>
            </>
        );
    };

    const renderSkillDetails = () => {
        const skill = selectedEntity;
        return (
            <>
                <DetailSection title="Basic Information">
                    <DetailRow icon={User} label="User" value={skill.userName} />
                    {skill.avatar && (
                        <div className="flex items-start gap-3 py-2">
                            <User size={18} className="text-black mt-0.5" />
                            <div>
                                <p className="text-xs text-black/60 mb-1">Avatar</p>
                                <img src={skill.avatar} alt="User avatar" className="w-12 h-12 rounded-full border" />
                            </div>
                        </div>
                    )}
                    <DetailRow icon={GraduationCap} label="Skill" value={skill.skill} />
                    <DetailRow icon={Tag} label="Category" value={skill.category} />
                    <DetailRow icon={WorkIcon} label="Proficiency" value={skill.proficiency} />
                    <DetailRow icon={MapPin} label="Location" value={skill.location} />
                    <DetailRow icon={Globe} label="Remote Work" value={skill.remoteWork ? "Yes" : "No"} />
                </DetailSection>

                <DetailSection title="Offer & Exchange">
                    <DetailRow icon={FileText} label="Offer" value={skill.offer} />
                    <DetailRow icon={FileText} label="Exchange For" value={skill.exchangeFor} />
                    <DetailRow icon={FileText} label="About" value={skill.about} />
                </DetailSection>

                <DetailSection title="Experience & Availability">
                    <DetailRow icon={WorkIcon} label="Years of Experience" value={skill.experience?.years} />
                    <DetailRow icon={FileText} label="Experience Description" value={skill.experience?.description} />
                    <DetailRow icon={Clock} label="Availability" value={skill.availability?.status} />
                    <DetailRow icon={Clock} label="Hours/Week" value={skill.availability?.hoursPerWeek} />
                </DetailSection>

                <DetailSection title="Portfolio & Links">
                    <DetailArray icon={Link} label="Portfolio Links" items={skill.portfolioLinks} />
                    <DetailArray icon={Globe} label="Languages" items={skill.languages?.map(l => `${l.language} (${l.proficiency})`)} />
                </DetailSection>

                <DetailSection title="Tags & Metadata">
                    <DetailArray icon={Tag} label="Tags" items={skill.tags} />
                    <DetailRow icon={Star} label="Rating" value={skill.rating?.average ? `${skill.rating.average} (${skill.rating.count} reviews)` : null} />
                    <DetailRow icon={Heart} label="Favorites" value={skill.favoritesCount} />
                    <DetailRow icon={ViewIcon} label="Views" value={skill.views} />
                    <DetailRow icon={MessageCircle} label="Active Requests" value={skill.activeRequestsCount} />
                    <DetailRow icon={ThumbsUp} label="Response Rate" value={skill.responseRate ? `${skill.responseRate}%` : null} />
                    <DetailRow icon={Shield} label="Verified" value={skill.isVerified ? "Yes" : "No"} />
                </DetailSection>

                <DetailSection title="Status & Dates">
                    <DetailRow
                        icon={AlertCircle}
                        label="Status"
                        value={
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(skill.status)}`}>
                                {skill.status}
                            </span>
                        }
                    />
                    <DetailRow icon={Calendar} label="Created" value={formatDate(skill.createdAt)} />
                    <DetailRow icon={Clock} label="Updated" value={formatDate(skill.updatedAt)} />
                </DetailSection>

                {skill.requests && skill.requests.length > 0 && (
                    <DetailSection title="Requests">
                        {skill.requests.map((req, index) => (
                            <div key={index} className="border rounded-lg p-3 mb-2">
                                <DetailRow icon={User} label="From" value={req.fromUser} />
                                <DetailRow icon={MessageCircle} label="Message" value={req.message} />
                                <DetailRow
                                    icon={AlertCircle}
                                    label="Status"
                                    value={
                                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    }
                                />
                                <DetailRow icon={Calendar} label="Date" value={formatDate(req.createdAt)} />
                            </div>
                        ))}
                    </DetailSection>
                )}
            </>
        );
    };

    const renderOrderDetails = () => {
        const order = selectedEntity;
        return (
            <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <Lock size={20} className="text-blue-600" />
                    <div>
                        <p className="text-sm font-medium text-blue-800">View Only Mode</p>
                        <p className="text-xs text-blue-600">Orders cannot be edited or deleted</p>
                    </div>
                </div>

                <DetailSection title="Order Information">
                    <DetailRow icon={ShoppingCart} label="Order Number" value={order.orderNumber} />
                    <DetailRow icon={CurrencyIcon} label="Total" value={formatKES(order.total)} />
                    <DetailRow icon={CreditCard} label="Payment Status" value={order.paymentStatus} />
                    <DetailRow icon={Package} label="Items" value={order.items} />
                </DetailSection>

                <DetailSection title="Buyer Information">
                    <DetailRow icon={User} label="Buyer" value={order.buyer?.profile?.fullName} />
                    <DetailRow icon={Mail} label="Email" value={order.buyer?.email} />
                </DetailSection>

                <DetailSection title="Status & Dates">
                    <DetailRow
                        icon={AlertCircle}
                        label="Status"
                        value={
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                        }
                    />
                    <DetailRow icon={Calendar} label="Created" value={formatDate(order.createdAt)} />
                    <DetailRow icon={Clock} label="Updated" value={formatDate(order.updatedAt)} />
                </DetailSection>
            </>
        );
    };

    const renderIntentDetails = () => {
        const intent = selectedEntity;
        return (
            <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <Lock size={20} className="text-blue-600" />
                    <div>
                        <p className="text-sm font-medium text-blue-800">View Only Mode</p>
                        <p className="text-xs text-blue-600">Payment Intents cannot be edited or deleted</p>
                    </div>
                </div>

                <DetailSection title="Payment Information">
                    <DetailRow icon={CurrencyIcon} label="Amount" value={formatCurrency(intent.amount, intent.currency)} />
                    <DetailRow icon={CreditCard} label="Currency" value={intent.currency} />
                    <DetailRow icon={CreditCard} label="Payment Method" value={intent.paymentMethod} />
                    <DetailRow
                        icon={AlertCircle}
                        label="Status"
                        value={
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(intent.status)}`}>
                                {intent.status}
                            </span>
                        }
                    />
                </DetailSection>

                <DetailSection title="User Information">
                    <DetailRow icon={User} label="User" value={intent.user?.profile?.fullName} />
                    <DetailRow icon={Mail} label="Email" value={intent.user?.email} />
                </DetailSection>

                <DetailSection title="Dates">
                    <DetailRow icon={Calendar} label="Created" value={formatDate(intent.createdAt)} />
                    <DetailRow icon={Clock} label="Updated" value={formatDate(intent.updatedAt)} />
                </DetailSection>
            </>
        );
    };

    const renderEntityFields = () => {
        if (!selectedEntity) return null;

        switch (filters.entity) {
            case "products":
                return renderProductDetails();
            case "jobs":
                return renderJobDetails();
            case "funding":
                return renderFundingDetails();
            case "skills":
                return renderSkillDetails();
            case "orders":
                return renderOrderDetails();
            case "intents":
                return renderIntentDetails();
            default:
                return <pre className="text-sm text-black">{JSON.stringify(selectedEntity, null, 2)}</pre>;
        }
    };

    /* ============================================================
       Render Edit Forms
    ============================================================= */

    const renderProductForm = () => {
        return (
            <>
                <FormField label="Title" required>
                    <FormInput
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter product title"
                    />
                </FormField>

                <FormField label="Description" required>
                    <FormTextarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter product description"
                    />
                </FormField>

                <FormField label="Price (KES)" required>
                    <FormInput
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="Enter price"
                    />
                </FormField>

                <FormField label="Category" required>
                    <FormSelect
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        options={[
                            { value: "crafts", label: "Crafts" },
                            { value: "beauty", label: "Beauty" },
                            { value: "fashion", label: "Fashion" },
                            { value: "home", label: "Home" },
                            { value: "digital", label: "Digital" },
                            { value: "other", label: "Other" },
                        ]}
                    />
                </FormField>

                <FormField label="Seller Name" required>
                    <FormInput
                        value={formData.sellerName}
                        onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                        placeholder="Enter seller name"
                    />
                </FormField>

                <FormField label="Location" required>
                    <FormInput
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Enter location"
                    />
                </FormField>

                <FormField label="Condition">
                    <FormSelect
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        options={[
                            { value: "new", label: "New" },
                            { value: "used", label: "Used" },
                            { value: "refurbished", label: "Refurbished" },
                        ]}
                    />
                </FormField>

                <FormField label="Quantity">
                    <FormInput
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="Enter quantity"
                    />
                </FormField>

                <FormField label="Tags">
                    <FormArray
                        values={formData.tags}
                        onChange={(tags) => setFormData({ ...formData, tags })}
                        placeholder="Add a tag"
                        addLabel="Add Tag"
                    />
                </FormField>

                <FormField label="Images (URLs)">
                    <FormArray
                        values={formData.images}
                        onChange={(images) => setFormData({ ...formData, images })}
                        placeholder="Add image URL"
                        addLabel="Add Image"
                    />
                </FormField>

                <FormField label="Status">
                    <FormSelect
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        options={[
                            { value: "active", label: "Active" },
                            { value: "sold", label: "Sold" },
                            { value: "hidden", label: "Hidden" },
                            { value: "expired", label: "Expired" },
                        ]}
                    />
                </FormField>
            </>
        );
    };

    const renderJobForm = () => {
        return (
            <>
                <FormField label="Title" required>
                    <FormInput
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter job title"
                    />
                </FormField>

                <FormField label="Company" required>
                    <FormInput
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Enter company name"
                    />
                </FormField>

                <FormField label="Description" required>
                    <FormTextarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter job description"
                    />
                </FormField>

                <FormField label="Category" required>
                    <FormSelect
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        options={[
                            { value: "technology", label: "Technology" },
                            { value: "marketing", label: "Marketing" },
                            { value: "finance", label: "Finance" },
                            { value: "healthcare", label: "Healthcare" },
                            { value: "education", label: "Education" },
                            { value: "other", label: "Other" },
                        ]}
                    />
                </FormField>

                <FormField label="Job Type" required>
                    <FormSelect
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        options={[
                            { value: "full-time", label: "Full Time" },
                            { value: "part-time", label: "Part Time" },
                            { value: "contract", label: "Contract" },
                            { value: "remote", label: "Remote" },
                            { value: "internship", label: "Internship" },
                        ]}
                    />
                </FormField>

                <FormField label="Location" required>
                    <FormInput
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Enter location"
                    />
                </FormField>

                <FormField label="Salary" required>
                    <FormInput
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        placeholder="Enter salary range"
                    />
                </FormField>

                <FormField label="Experience Level">
                    <FormSelect
                        value={formData.experienceLevel}
                        onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                        options={[
                            { value: "entry", label: "Entry Level" },
                            { value: "mid", label: "Mid Level" },
                            { value: "senior", label: "Senior Level" },
                            { value: "executive", label: "Executive" },
                        ]}
                    />
                </FormField>

                <FormField label="Skills Required">
                    <FormArray
                        values={formData.skills}
                        onChange={(skills) => setFormData({ ...formData, skills })}
                        placeholder="Add a skill"
                        addLabel="Add Skill"
                    />
                </FormField>

                <FormField label="Requirements">
                    <FormArray
                        values={formData.requirements}
                        onChange={(reqs) => setFormData({ ...formData, requirements: reqs })}
                        placeholder="Add a requirement"
                        addLabel="Add Requirement"
                    />
                </FormField>

                <FormField label="Contact Email" required>
                    <FormInput
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        placeholder="Enter contact email"
                    />
                </FormField>

                <FormField label="Application Deadline">
                    <FormInput
                        type="date"
                        value={formData.applicationDeadline ? formData.applicationDeadline.split('T')[0] : ""}
                        onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                    />
                </FormField>

                <FormField label="Tags">
                    <FormArray
                        values={formData.tags}
                        onChange={(tags) => setFormData({ ...formData, tags })}
                        placeholder="Add a tag"
                        addLabel="Add Tag"
                    />
                </FormField>

                <FormField label="Remote Work">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.isRemote || false}
                            onChange={(e) => setFormData({ ...formData, isRemote: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <span className="text-sm text-black">This is a remote position</span>
                    </label>
                </FormField>

                <FormField label="Status">
                    <FormSelect
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        options={[
                            { value: "active", label: "Active" },
                            { value: "filled", label: "Filled" },
                            { value: "closed", label: "Closed" },
                            { value: "expired", label: "Expired" },
                        ]}
                    />
                </FormField>
            </>
        );
    };

    const renderFundingForm = () => {
        return (
            <>
                <FormField label="Title" required>
                    <FormInput
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter funding title"
                    />
                </FormField>

                <FormField label="Provider" required>
                    <FormInput
                        value={formData.provider}
                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                        placeholder="Enter provider name"
                    />
                </FormField>

                <FormField label="Description" required>
                    <FormTextarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter funding description"
                    />
                </FormField>

                <FormField label="Category" required>
                    <FormSelect
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        options={[
                            { value: "technology", label: "Technology" },
                            { value: "agriculture", label: "Agriculture" },
                            { value: "education", label: "Education" },
                            { value: "healthcare", label: "Healthcare" },
                            { value: "women", label: "Women" },
                            { value: "youth", label: "Youth" },
                            { value: "other", label: "Other" },
                        ]}
                    />
                </FormField>

                <FormField label="Funding Type" required>
                    <FormSelect
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        options={[
                            { value: "grant", label: "Grant" },
                            { value: "loan", label: "Loan" },
                            { value: "scholarship", label: "Scholarship" },
                            { value: "fellowship", label: "Fellowship" },
                            { value: "prize", label: "Prize" },
                        ]}
                    />
                </FormField>

                <FormField label="Amount" required>
                    <FormInput
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="Enter funding amount"
                    />
                </FormField>

                <FormField label="Deadline" required>
                    <FormInput
                        type="date"
                        value={formData.deadline ? formData.deadline.split('T')[0] : ""}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                </FormField>

                <FormField label="Eligibility">
                    <FormTextarea
                        value={formData.eligibility}
                        onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                        placeholder="Enter eligibility criteria"
                        rows={3}
                    />
                </FormField>

                <FormField label="Requirements">
                    <FormArray
                        values={formData.requirements}
                        onChange={(reqs) => setFormData({ ...formData, requirements: reqs })}
                        placeholder="Add a requirement"
                        addLabel="Add Requirement"
                    />
                </FormField>

                <FormField label="Focus Areas">
                    <FormArray
                        values={formData.focusAreas}
                        onChange={(areas) => setFormData({ ...formData, focusAreas: areas })}
                        placeholder="Add a focus area"
                        addLabel="Add Focus Area"
                    />
                </FormField>

                <FormField label="Application Process">
                    <FormArray
                        values={formData.applicationProcess}
                        onChange={(process) => setFormData({ ...formData, applicationProcess: process })}
                        placeholder="Add application step"
                        addLabel="Add Step"
                    />
                </FormField>

                <FormField label="Contact Email" required>
                    <FormInput
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        placeholder="Enter contact email"
                    />
                </FormField>

                <FormField label="Website">
                    <FormInput
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="Enter website URL"
                    />
                </FormField>

                <FormField label="Tags">
                    <FormArray
                        values={formData.tags}
                        onChange={(tags) => setFormData({ ...formData, tags })}
                        placeholder="Add a tag"
                        addLabel="Add Tag"
                    />
                </FormField>

                <FormField label="Status">
                    <FormSelect
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        options={[
                            { value: "open", label: "Open" },
                            { value: "closed", label: "Closed" },
                            { value: "coming_soon", label: "Coming Soon" },
                            { value: "completed", label: "Completed" },
                        ]}
                    />
                </FormField>

                <FormField label="Verified">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.isVerified || false}
                            onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <span className="text-sm text-black">This funding opportunity is verified</span>
                    </label>
                </FormField>
            </>
        );
    };

    const renderSkillForm = () => {
        return (
            <>
                <FormField label="Skill" required>
                    <FormInput
                        value={formData.skill}
                        onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                        placeholder="Enter your skill"
                    />
                </FormField>

                <FormField label="Category" required>
                    <FormSelect
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        options={[
                            { value: "design", label: "Design" },
                            { value: "marketing", label: "Marketing" },
                            { value: "development", label: "Development" },
                            { value: "finance", label: "Finance" },
                            { value: "writing", label: "Writing" },
                            { value: "consulting", label: "Consulting" },
                            { value: "other", label: "Other" },
                        ]}
                    />
                </FormField>

                <FormField label="Proficiency">
                    <FormSelect
                        value={formData.proficiency}
                        onChange={(e) => setFormData({ ...formData, proficiency: e.target.value })}
                        options={[
                            { value: "beginner", label: "Beginner" },
                            { value: "intermediate", label: "Intermediate" },
                            { value: "advanced", label: "Advanced" },
                            { value: "expert", label: "Expert" },
                        ]}
                    />
                </FormField>

                <FormField label="Offer" required>
                    <FormTextarea
                        value={formData.offer}
                        onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
                        placeholder="What skill/service do you offer?"
                        rows={3}
                    />
                </FormField>

                <FormField label="Exchange For" required>
                    <FormTextarea
                        value={formData.exchangeFor}
                        onChange={(e) => setFormData({ ...formData, exchangeFor: e.target.value })}
                        placeholder="What do you want in exchange?"
                        rows={3}
                    />
                </FormField>

                <FormField label="About">
                    <FormTextarea
                        value={formData.about}
                        onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                        placeholder="Tell us about yourself"
                        rows={3}
                    />
                </FormField>

                <FormField label="Location" required>
                    <FormInput
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Enter your location"
                    />
                </FormField>

                <FormField label="Years of Experience">
                    <FormInput
                        type="number"
                        value={formData.experience?.years}
                        onChange={(e) => setFormData({
                            ...formData,
                            experience: { ...formData.experience, years: e.target.value }
                        })}
                        placeholder="Years of experience"
                    />
                </FormField>

                <FormField label="Experience Description">
                    <FormTextarea
                        value={formData.experience?.description}
                        onChange={(e) => setFormData({
                            ...formData,
                            experience: { ...formData.experience, description: e.target.value }
                        })}
                        placeholder="Describe your experience"
                        rows={2}
                    />
                </FormField>

                <FormField label="Availability">
                    <FormSelect
                        value={formData.availability?.status}
                        onChange={(e) => setFormData({
                            ...formData,
                            availability: { ...formData.availability, status: e.target.value }
                        })}
                        options={[
                            { value: "available", label: "Available" },
                            { value: "busy", label: "Busy" },
                            { value: "unavailable", label: "Unavailable" },
                        ]}
                    />
                </FormField>

                <FormField label="Hours per Week">
                    <FormInput
                        type="number"
                        value={formData.availability?.hoursPerWeek}
                        onChange={(e) => setFormData({
                            ...formData,
                            availability: { ...formData.availability, hoursPerWeek: e.target.value }
                        })}
                        placeholder="Hours available per week"
                    />
                </FormField>

                <FormField label="Portfolio Links">
                    <FormArray
                        values={formData.portfolioLinks}
                        onChange={(links) => setFormData({ ...formData, portfolioLinks: links })}
                        placeholder="Add portfolio URL"
                        addLabel="Add Link"
                    />
                </FormField>

                <FormField label="Languages">
                    <FormArray
                        values={formData.languages?.map(l => `${l.language} (${l.proficiency})`)}
                        onChange={(langs) => {
                            // Parse back to objects
                            const parsed = langs.map(l => {
                                const match = l.match(/(.+)\s*\((.+)\)/);
                                return match ? { language: match[1].trim(), proficiency: match[2].trim() } : { language: l, proficiency: 'intermediate' };
                            });
                            setFormData({ ...formData, languages: parsed });
                        }}
                        placeholder="Add language (e.g., English (fluent))"
                        addLabel="Add Language"
                    />
                </FormField>

                <FormField label="Tags">
                    <FormArray
                        values={formData.tags}
                        onChange={(tags) => setFormData({ ...formData, tags })}
                        placeholder="Add a tag"
                        addLabel="Add Tag"
                    />
                </FormField>

                <FormField label="Remote Work">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.remoteWork || false}
                            onChange={(e) => setFormData({ ...formData, remoteWork: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <span className="text-sm text-black">Open to remote work</span>
                    </label>
                </FormField>

                <FormField label="Status">
                    <FormSelect
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        options={[
                            { value: "active", label: "Active" },
                            { value: "paused", label: "Paused" },
                            { value: "completed", label: "Completed" },
                            { value: "hidden", label: "Hidden" },
                        ]}
                    />
                </FormField>
            </>
        );
    };

    const renderEditForm = () => {
        if (!currentEntity.creatable && !selectedEntity?._id) {
            return (
                <div className="text-center py-8 text-black">
                    <Lock size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="font-medium">Cannot create {filters.entity}</p>
                    <p className="text-sm text-black/60 mt-2">This entity type is view-only</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {filters.entity === "products" && renderProductForm()}
                {filters.entity === "jobs" && renderJobForm()}
                {filters.entity === "funding" && renderFundingForm()}
                {filters.entity === "skills" && renderSkillForm()}

                <div className="flex gap-2 pt-6 border-t">
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-black text-white rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800"
                    >
                        <Save size={16} />
                        {selectedEntity?._id ? "Update" : "Create"}
                    </button>
                    <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 border rounded-lg text-black hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    };

    /* ============================================================
       Main Render
    ============================================================= */

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50">
                {/* ================= HEADER ================= */}
                <div className="bg-white border-b sticky top-0 z-10">
                    <div className="px-8 py-5 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-black">
                                Marketplace Management
                            </h1>
                            <p className="text-sm text-black">
                                Manage marketplace entities and monitor payments
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {currentEntity.creatable && (
                                <button
                                    onClick={openCreateModal}
                                    className="px-4 py-2 bg-black text-white rounded-xl flex items-center gap-2 hover:bg-gray-800"
                                >
                                    <Plus size={16} />
                                    Create New
                                </button>
                            )}

                            <button
                                onClick={() => dispatch(fetchEntities())}
                                className="w-10 h-10 rounded-xl border bg-white hover:bg-gray-50 flex items-center justify-center"
                            >
                                <RefreshCw size={16} className="text-black" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ================= CONTENT ================= */}
                <div className="px-8 py-6">

                    {/* ================= ENTITY TABS ================= */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {ENTITY_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() =>
                                        dispatch(setMarketplaceFilters({ entity: opt.value, page: 1 }))
                                    }
                                    className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${filters.entity === opt.value
                                            ? "bg-white border-purple-200 text-purple-800"
                                            : "bg-gray-50 border-gray-200 text-black hover:bg-white"
                                        }`}
                                >
                                    <Icon size={16} className="text-black" />
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ================= FILTERS ================= */}
                    <div className="bg-white rounded-2xl border p-4 mb-6">
                        <div className="flex gap-3 flex-wrap items-center">

                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-3 text-black" />
                                <input
                                    placeholder="Search..."
                                    className="pl-9 pr-3 py-2 rounded-xl border bg-gray-50 text-black focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    value={filters.search || ""}
                                    onChange={(e) =>
                                        dispatch(
                                            setMarketplaceFilters({ search: e.target.value, page: 1 })
                                        )
                                    }
                                />
                            </div>

                            <select
                                value={filters.sort || "newest"}
                                onChange={(e) =>
                                    dispatch(setMarketplaceFilters({ sort: e.target.value }))
                                }
                                className="px-3 py-2 rounded-xl border bg-gray-50 text-black focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="newest">Newest</option>
                                <option value="oldest">Oldest</option>
                            </select>
                        </div>
                    </div>

                    {/* ================= TABLE ================= */}
                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                        {entitiesLoading ? (
                            <div className="p-10 text-center">
                                <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-black">Loading entities...</p>
                            </div>
                        ) : entities?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-black">
                                        <tr>
                                            <th className="px-5 py-3 text-left font-medium">Title</th>
                                            <th className="px-5 py-3 text-left font-medium">Status</th>
                                            <th className="px-5 py-3 text-left font-medium">Created</th>
                                            <th className="px-5 py-3 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {entities.map((item) => (
                                            <tr key={item._id} className="hover:bg-gray-50">
                                                <td className="px-5 py-4 text-black">
                                                    {item.title || item.skill || item.orderNumber || "—"}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.status || item.state)}`}>
                                                        {item.status || item.state || "—"}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-black">
                                                    {formatDate(item.createdAt)}
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openDetail(item._id)}
                                                            className="w-9 h-9 border rounded-lg flex items-center justify-center hover:bg-gray-50"
                                                            title="View details"
                                                        >
                                                            <Eye size={16} className="text-black" />
                                                        </button>

                                                        {currentEntity.deletable && (
                                                            <button
                                                                onClick={() => handleDelete(item._id)}
                                                                className="w-9 h-9 border rounded-lg flex items-center justify-center hover:bg-gray-50"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} className="text-rose-600" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-10 text-center">
                                <Package size={48} className="mx-auto mb-4 text-gray-400" />
                                <p className="text-black font-medium">No data available</p>
                                <p className="text-sm text-black/60 mt-2">Try adjusting your filters or create a new entity</p>
                            </div>
                        )}

                        {/* ================= PAGINATION ================= */}
                        {pagination && pagination.pages > 1 && (
                            <div className="px-5 py-4 border-t flex items-center justify-between">
                                <p className="text-black">
                                    Page {pagination.page} of {pagination.pages}
                                </p>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => goPage(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="px-3 py-1 border rounded-lg text-black disabled:opacity-50 hover:bg-gray-50"
                                    >
                                        <ChevronLeft size={16} className="text-black" />
                                    </button>

                                    <button
                                        onClick={() => goPage(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.pages}
                                        className="px-3 py-1 border rounded-lg text-black disabled:opacity-50 hover:bg-gray-50"
                                    >
                                        <ChevronRight size={16} className="text-black" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ================= DETAIL MODAL ================= */}
                {modalOpen && (
                    <div className="fixed inset-0 z-50">
                        <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
                        <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl overflow-y-auto">
                            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                                <div>
                                    <h3 className="font-semibold text-black">
                                        {editMode
                                            ? selectedEntity?._id
                                                ? "Edit"
                                                : "Create"
                                            : "View"} {filters.entity}
                                    </h3>
                                    {selectedEntity?._id && (
                                        <p className="text-xs text-black/60 mt-1">ID: {selectedEntity._id}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedEntity?._id && !editMode && currentEntity.creatable && (
                                        <button
                                            onClick={() => setEditMode(true)}
                                            className="px-3 py-1 border rounded-lg flex items-center gap-1 text-black hover:bg-gray-50"
                                        >
                                            <Edit size={14} />
                                            Edit
                                        </button>
                                    )}
                                    <button onClick={closeModal} className="p-2 hover:bg-gray-50 rounded-lg">
                                        <X size={18} className="text-black" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {selectedLoading ? (
                                    <div className="text-center py-8">
                                        <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-black">Loading...</p>
                                    </div>
                                ) : editMode ? (
                                    renderEditForm()
                                ) : selectedEntity ? (
                                    <div className="space-y-4">
                                        {renderEntityFields()}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-black">No data available.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}