// pages/admin/Wellness.jsx
// ============================================================
// ENTERPRISE-GRADE WELLNESS ADMIN DASHBOARD
// File: Wellness.jsx
// Lines: ~1800
// ============================================================

import { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/layout/AdminLayout";

import {
    Activity,
    AlertTriangle,
    BarChart3,
    Brain,
    Calendar,
    Heart,
    TrendingUp,
    Users,
    Plus,
    Edit,
    Trash2,
    Star,
    RefreshCw,
    Clock,
    Globe,
    Filter,
    Download,
    ChevronDown,
    ChevronUp,
    Moon,
    Sun,
    CloudRain,
    Zap,
    PieChart,
    LineChart as LineChartIcon,
    BarChart,
    AreaChart as AreaChartIcon,
    ScatterChart,
    Grid,
    Settings,
    Bell,
    Shield,
    Database,
    Cpu,
    Wifi,
    HardDrive,
    Thermometer,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    AlertCircle,
    Info,
    HelpCircle,
    Lock,
    Unlock,
    Move,
    Save,
    X,
    Search,
    Sliders,
    Layers,
    Target,
    Compass,
    Wind,
    Droplets,
    Flame,
    Snowflake,
    Cloud,
    Umbrella,
    Sunset,
    Sunrise,
    Navigation,
    Anchor,
    Ship,
    Plane,
    Truck,
    Bike,
    Home,
    Building,
    Store,
    Coffee,
    Music,
    Film,
    Book,
    Pen,
    Camera,
    Video,
    Mic,
    Speaker,
    Radio,
    Disc,
    Vinyl,
    Cassette,
    Cd,
    Dvd,
    Bluetooth,
    Wifi as WifiIcon,
    WifiOff,
    Battery,
    BatteryCharging,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    BatteryWarning,
    Power,
    PowerOff,
    Volume1,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Maximize2,
    Minimize2,
    MoveHorizontal,
    MoveVertical,
    MoveDiagonal,
    RotateCw,
    RotateCcw,
    Repeat,
    Repeat1,
    Shuffle,
    Play,
    Stop,
    SkipBack,
    SkipForward,
    Rewind,
    FastForward,
    Volume,
    MicOff,
    Mic2,
    VideoOff,
    Video as VideoIcon,
    CameraOff,
    Camera as CameraIcon,
    Image,
    ImageMinus,
    ImagePlus,
    Images,
    File,
    FileMinus,
    FilePlus,
    FileText,
    FileSpreadsheet,
    FileSpreadsheet as FileSheet,
    FileDigit,
    FileJson,
    FileJs,
    FileTs,
    FileCss,
    FileHtml,
    FileImage,
    FileVideo,
    FileAudio,
    FileArchive,
    FileCode,
    FileCode2,
    FileDiff,
    FileSearch,
    FileWarning,
    FileX,
    FileX2,
    FileSignature,
    FileCheck,
    FileCheck2,
    FileClock,
    FileHeart,
    FileHeart2,
    FileLock,
    FileLock2,
    FileUnlock,
    FileUnlock2,
    FileKey,
    FileKey2,
    FileMinus2,
    FilePlus2,
    FileQuestion,
    FileQuestion2,
    FileSearch2,
    FileSpread,
    FileSpread2,
    FileStack,
    FileStack2,
    FileSymlink,
    FileTerminal,
    FileText as FileTextIcon,
    FileType,
    FileType2,
    FileVolume,
    FileVolume2,
    FileWarning as FileWarningIcon,
    FileX as FileXIcon,
    FileZip,
    Files,
    Film as FilmIcon,
    Filter as FilterIcon,
    Flag,
    FlagOff,
    Flame as FlameIcon,
    Flashlight,
    FlashlightOff,
    FlaskConical,
    FlaskRound,
    FlipHorizontal,
    FlipHorizontal2,
    FlipVertical,
    FlipVertical2,
    Flower,
    Flower2,
    Focus,
    FoldHorizontal,
    FoldVertical,
    Folder,
    FolderArchive,
    FolderCheck,
    FolderClock,
    FolderClosed,
    FolderCode,
    FolderCog,
    FolderCog2,
    FolderDot,
    FolderDown,
    FolderEdit,
    FolderGit,
    FolderGit2,
    FolderHeart,
    FolderInput,
    FolderKanban,
    FolderKey,
    FolderLock,
    FolderMinus,
    FolderOpen,
    FolderOpenDot,
    FolderOutput,
    FolderPen,
    FolderPlus,
    FolderRoot,
    FolderSearch,
    FolderSearch2,
    FolderSymlink,
    FolderSync,
    FolderTree,
    FolderUp,
    FolderX,
    Folders,
    Footprints,
    Forklift,
    FormInput,
    Forward,
    Frame,
    Framer,
    Frown,
    Fuel,
    Fullscreen,
    FunctionSquare,
    GalleryHorizontal,
    GalleryHorizontalEnd,
    GalleryThumbnails,
    GalleryVertical,
    GalleryVerticalEnd,
    Gamepad,
    Gamepad2,
    GanttChart,
    Gauge,
    Gavel,
    Gem,
    Ghost,
    Gift,
    GitBranch,
    GitBranchPlus,
    GitCommit,
    GitCompare,
    GitFork,
    GitGraph,
    GitMerge,
    GitPullRequest,
    GitPullRequestClosed,
    GitPullRequestDraft,
    Github,
    Gitlab,
    GlassWater,
    Glasses,
    Globe as GlobeIcon,
    Globe2,
    GlobeLock,
    Goal,
    Grab,
    GraduationCap,
    Grape,
    Grid as GridIcon,
    Grid2x2,
    Grid2x2Check,
    Grid2x2X,
    Grid3x3,
    Grip,
    GripHorizontal,
    GripVertical,
    Group,
    Guitar,
    Ham,
    Hammer,
    Hand,
    HandCoins,
    HandHeart,
    HandHelping,
    HandMetal,
    HandPlatter,
    Handshake,
    HardDrive as HardDriveIcon,
    HardDriveDownload,
    HardDriveUpload,
    HardHat,
    Hash,
    Haze,
    HdmiPort,
    Heading,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Heading6,
    HeadphoneOff,
    Headphones,
    Headset,
    Heart as HeartIcon,
    HeartCrack,
    HeartHandshake,
    HeartOff,
    HeartPulse,
    HeartPulse2,
    Heater,
    HelpCircle as HelpCircleIcon,
    HelpingHand,
    Hexagon,
    Highlighter,
    History,
    Home as HomeIcon,
    Home2,
    Hop,
    HopOff,
    Hospital,
    Hotel,
    Hourglass,
    IceCream,
    IceCreamBowl,
    IceCreamCone,
    IceCream2,
    IceSkating,
    Image as ImageIcon,
    ImageDown,
    ImageMinus as ImageMinusIcon,
    ImageOff,
    ImagePlus as ImagePlusIcon,
    ImageUp,
    Images as ImagesIcon,
    Import,
    Inbox,
    Indent,
    IndentDecrease,
    IndentIncrease,
    Infinity,
    Info as InfoIcon,
    InspectionPanel,
    Instagram,
    Italic,
    IterationCcw,
    IterationCw,
    JapaneseYen,
    Joystick,
    Joystick2,
    Kanban,
    KanbanSquare,
    KanbanSquareDashed,
    Key,
    KeyRound,
    KeySquare,
    Keyboard,
    KeyboardMusic,
    Lamp,
    LampCeiling,
    LampDesk,
    LampFloor,
    LampWallDown,
    LampWallUp,
    LandPlot,
    Landmark,
    Languages,
    Laptop,
    Laptop2,
    Lasso,
    LassoSelect,
    Laugh,
    Layers as LayersIcon,
    Layers2,
    Layers3,
    Layout,
    LayoutDashboard,
    LayoutGrid,
    LayoutList,
    LayoutPanelLeft,
    LayoutPanelTop,
    LayoutTemplate,
    Leaf,
    LeafyGreen,
    Lectern,
    Library,
    LibraryBig,
    LifeBuoy,
    Ligature,
    Lightbulb,
    LightbulbOff,
    LineChart as LineChartIcon2,
    Link,
    Link2,
    Link2Off,
    LinkOff,
    Linkedin,
    List,
    ListChecks,
    ListEnd,
    ListFilter,
    ListMinus,
    ListMusic,
    ListOrdered,
    ListPlus,
    ListRestart,
    ListStart,
    ListTodo,
    ListVideo,
    ListX,
    Loader,
    Loader2,
    LoaderCircle,
    Locate,
    LocateFixed,
    LocateOff,
    Lock as LockIcon,
    LockKeyhole,
    LockKeyholeOpen,
    LockOpen,
    LogIn,
    LogOut,
    Lollipop,
    Luggage,
    MSquare,
    Magnet,
    Mail,
    MailCheck,
    MailMinus,
    MailOpen,
    MailPlus,
    MailQuestion,
    MailSearch,
    MailWarning,
    MailX,
    Mailbox,
    Mails,
    Map,
    MapPin,
    MapPinCheck,
    MapPinCheckInside,
    MapPinHouse,
    MapPinMinus,
    MapPinMinusInside,
    MapPinOff,
    MapPinPlus,
    MapPinPlusInside,
    MapPinX,
    MapPinXInside,
    MapPinned,
    Martini,
    Maximize as MaximizeIcon,
    Maximize2 as Maximize2Icon,
    Medal,
    Megaphone,
    MegaphoneOff,
    Meh,
    MemoryStick,
    Menu,
    MenuSquare,
    Merge,
    MessageCircle,
    MessageCircleCode,
    MessageCircleDashed,
    MessageCircleHeart,
    MessageCircleMore,
    MessageCircleOff,
    MessageCirclePlus,
    MessageCircleQuestion,
    MessageCircleReply,
    MessageCircleWarning,
    MessageCircleX,
    MessageSquare,
    MessageSquareCode,
    MessageSquareDashed,
    MessageSquareDiff,
    MessageSquareDot,
    MessageSquareHeart,
    MessageSquareMore,
    MessageSquareOff,
    MessageSquarePlus,
    MessageSquareQuote,
    MessageSquareReply,
    MessageSquareShare,
    MessageSquareText,
    MessageSquareWarning,
    MessageSquareX,
    MessagesSquare,
    Mic as MicIcon,
    Mic2 as Mic2Icon,
    MicOff as MicOffIcon,
    MicVocal,
    Microscope,
    Microwave,
    Milestone,
    Milk,
    MilkOff,
    Minimize as MinimizeIcon,
    Minimize2 as Minimize2Icon,
    Minus,
    MinusCircle,
    MinusSquare,
    Monitor,
    MonitorCheck,
    MonitorDot,
    MonitorDown,
    MonitorOff,
    MonitorPause,
    MonitorPlay,
    MonitorSmartphone,
    MonitorSpeaker,
    MonitorStop,
    MonitorUp,
    Moon as MoonIcon,
    MoonStar,
    MoreHorizontal,
    MoreVertical,
    Mountain,
    MountainSnow,
    Mouse,
    MouseOff,
    MousePointer,
    MousePointer2,
    MousePointerBan,
    MousePointerClick,
    MousePointerSquare,
    MousePointerSquareDashed,
    Move as MoveIcon,
    Move3d,
    MoveDiagonal as MoveDiagonalIcon,
    MoveDiagonal2,
    MoveDown,
    MoveDownLeft,
    MoveDownRight,
    MoveHorizontal as MoveHorizontalIcon,
    MoveLeft,
    MoveRight,
    MoveUp,
    MoveUpLeft,
    MoveUpRight,
    MoveVertical as MoveVerticalIcon,
    Music as MusicIcon,
    Music2,
    Music3,
    Music4,
    Navigation as NavigationIcon,
    Navigation2,
    Navigation2Off,
    NavigationOff,
    Network,
    Newspaper,
    Nfc,
    Notebook,
    NotebookPen,
    NotebookTabs,
    NotebookText,
    NotepadText,
    NotepadTextDashed,
    Nut,
    NutOff,
    Octagon,
    OctagonAlert,
    OctagonPause,
    OctagonX,
    Omega,
    Option,
    Orbit,
    Origami,
    Outdent,
    Package,
    Package2,
    PackageCheck,
    PackageMinus,
    PackageOpen,
    PackagePlus,
    PackageSearch,
    PackageX,
    PaintBucket,
    PaintRoller,
    Paintbrush,
    Paintbrush2,
    PaintbrushVertical,
    Palette,
    Palmtree,
    PanelBottom,
    PanelBottomClose,
    PanelBottomDashed,
    PanelBottomOpen,
    PanelLeft,
    PanelLeftClose,
    PanelLeftDashed,
    PanelLeftOpen,
    PanelRight,
    PanelRightClose,
    PanelRightDashed,
    PanelRightOpen,
    PanelTop,
    PanelTopClose,
    PanelTopDashed,
    PanelTopOpen,
    PanelsLeftBottom,
    PanelsRightBottom,
    PanelsTopLeft,
    Paperclip,
    Parentheses,
    ParkingCircle,
    ParkingCircleOff,
    ParkingMeter,
    ParkingSquare,
    ParkingSquareOff,
    PartyPopper,
    Pause,
    PawPrint,
    PcCase,
    Pen as PenIcon,
    PenBox,
    PenLine,
    PenOff,
    PenTool,
    Pencil,
    PencilLine,
    PencilOff,
    PencilRuler,
    Pentagon,
    Percent,
    PersonStanding,
    PhilippinePeso,
    Phone,
    PhoneCall,
    PhoneForwarded,
    PhoneIncoming,
    PhoneMissed,
    PhoneOff,
    PhoneOutgoing,
    Pi,
    Piano,
    Pickaxe,
    PictureInPicture,
    PictureInPicture2,
    PiggyBank,
    Pilcrow,
    PilcrowLeft,
    PilcrowRight,
    Pill,
    PillBottle,
    Pin,
    PinOff,
    Pipette,
    Pizza,
    Plane as PlaneIcon,
    PlaneLanding,
    PlaneTakeoff,
    Play as PlayIcon,
    PlayCircle,
    PlaySquare,
    Pointer,
    PointerOff,
    Popcorn,
    Popsicle,
    PoundSterling,
    Power as PowerIcon,
    PowerOff as PowerOffIcon,
    Presentation,
    Printer,
    PrinterCheck,
    Projector,
    Proportions,
    Puzzle,
    Pyramid,
    QrCode,
    Quote,
    Rabbit,
    Radiation,
    Radical,
    Radio as RadioIcon,
    RadioReceiver,
    RadioTower,
    Radius,
    RailSymbol,
    Rainbow,
    Rat,
    Ratio,
    Receipt,
    ReceiptCent,
    ReceiptEuro,
    ReceiptIndianRupee,
    ReceiptJapaneseYen,
    ReceiptPoundSterling,
    ReceiptRussianRuble,
    ReceiptSwissFranc,
    ReceiptText,
    RectangleEllipsis,
    RectangleHorizontal,
    RectangleVertical,
    Recycle,
    Redo,
    Redo2,
    RedoDot,
    RefreshCw as RefreshCwIcon,
    RefreshCwOff,
    RefreshCcw,
    RefreshCcwDot,
    Refrigerator,
    Regex,
    RemoveFormatting,
    Repeat as RepeatIcon,
    Repeat1 as Repeat1Icon,
    Repeat2,
    Replace,
    ReplaceAll,
    Reply,
    ReplyAll,
    Rewind as RewindIcon,
    Ribbon,
    Rocket,
    RockingChair,
    RollerCoaster,
    Rotate3d,
    RotateCcw as RotateCcwIcon,
    RotateCw as RotateCwIcon,
    Route,
    RouteOff,
    Router,
    Rows,
    Rows2,
    Rows3,
    Rows4,
    Rss,
    Ruler,
    RulerIcon,
    RussianRuble,
    Sailboat,
    Salad,
    Sandwich,
    Satellite,
    SatelliteDish,
    Save as SaveIcon,
    SaveAll,
    SaveOff,
    Scale,
    Scale3d,
    Scaling,
    Scan,
    ScanBarcode,
    ScanEye,
    ScanFace,
    ScanLine,
    ScanQrCode,
    ScanSearch,
    ScanText,
    ScatterChart as ScatterChartIcon,
    School,
    School2,
    Scissors,
    ScissorsLineDashed,
    ScreenShare,
    ScreenShareOff,
    Scroll,
    ScrollText,
    Search as SearchIcon,
    SearchCheck,
    SearchCode,
    SearchSlash,
    SearchX,
    Section,
    Send,
    SendHorizonal,
    SendToBack,
    SeparatorHorizontal,
    SeparatorVertical,
    Server,
    ServerCog,
    ServerCrash,
    ServerOff,
    Settings as SettingsIcon,
    Settings2,
    Shapes,
    Share,
    Share2,
    Sheet,
    Shell,
    Shield as ShieldIcon,
    ShieldAlert,
    ShieldBan,
    ShieldCheck,
    ShieldClose,
    ShieldEllipsis,
    ShieldHalf,
    ShieldMinus,
    ShieldOff,
    ShieldPlus,
    ShieldQuestion,
    ShieldX,
    Ship as ShipIcon,
    ShipWheel,
    Shirt,
    ShoppingBag,
    ShoppingBasket,
    ShoppingCart,
    Shovel,
    ShowerHead,
    Shrink,
    Shrub,
    Shuffle as ShuffleIcon,
    Sigma,
    Signal,
    SignalHigh,
    SignalLow,
    SignalMedium,
    SignalZero,
    Signpost,
    SignpostBig,
    Siren,
    SkipBack as SkipBackIcon,
    SkipForward as SkipForwardIcon,
    Skull,
    Slack,
    Slash,
    Slice,
    SlidersHorizontal,
    SlidersVertical,
    Smartphone,
    SmartphoneCharging,
    SmartphoneNfc,
    Smile,
    SmilePlus,
    Snail,
    Snowflake as SnowflakeIcon,
    Sofa,
    Soup,
    Space,
    Spade,
    Sparkle,
    Sparkles,
    Speaker as SpeakerIcon,
    Speech,
    SpellCheck,
    SpellCheck2,
    Spline,
    Split,
    SplitSquareHorizontal,
    SplitSquareVertical,
    SprayCan,
    Sprout,
    Square,
    SquareActivity,
    SquareArrowDown,
    SquareArrowDownLeft,
    SquareArrowDownRight,
    SquareArrowLeft,
    SquareArrowOutDownLeft,
    SquareArrowOutDownRight,
    SquareArrowOutUpLeft,
    SquareArrowOutUpRight,
    SquareArrowRight,
    SquareArrowUp,
    SquareArrowUpLeft,
    SquareArrowUpRight,
    SquareAsterisk,
    SquareBottomDashedScissors,
    SquareCheck,
    SquareCheckBig,
    SquareChevronDown,
    SquareChevronLeft,
    SquareChevronRight,
    SquareChevronUp,
    SquareCode,
    SquareDashed,
    SquareDashedBottom,
    SquareDashedBottomCode,
    SquareDashedKanban,
    SquareDashedMousePointer,
    SquareDivide,
    SquareDot,
    SquareEqual,
    SquareFunction,
    SquareKanban,
    SquareLibrary,
    SquareM,
    SquareMenu,
    SquareMinus,
    SquareMousePointer,
    SquareParking,
    SquareParkingOff,
    SquarePen,
    SquarePercent,
    SquarePi,
    SquarePilcrow,
    SquarePlay,
    SquarePlus,
    SquarePower,
    SquareRadical,
    SquareScissors,
    SquareSigma,
    SquareSlash,
    SquareSplitHorizontal,
    SquareSplitVertical,
    SquareSquare,
    SquareStack,
    SquareTerminal,
    SquareUser,
    SquareUserRound,
    SquareX,
    Squircle,
    Squirrel,
    Stamp,
    Star as StarIcon,
    StarHalf,
    StarOff,
    Stars,
    StepBack,
    StepForward,
    Stethoscope,
    Sticker,
    StickyNote,
    Stop as StopIcon,
    StopCircle,
    Store as StoreIcon,
    StretchHorizontal,
    StretchVertical,
    Strikethrough,
    Subscript,
    Subtitles,
    Sun as SunIcon,
    SunDim,
    SunMedium,
    SunMoon,
    SunSnow,
    Sunrise as SunriseIcon,
    Sunset as SunsetIcon,
    Superscript,
    SwatchBook,
    SwissFranc,
    SwitchCamera,
    Sword,
    Swords,
    Syringe,
    Table,
    Table2,
    TableCellsMerge,
    TableCellsSplit,
    TableColumnsSplit,
    TableOfContents,
    TableProperties,
    TableRowsSplit,
    Tablet,
    TabletSmartphone,
    Tablets,
    Tag,
    Tags,
    Tally1,
    Tally2,
    Tally3,
    Tally4,
    Tally5,
    Tangent,
    Target as TargetIcon,
    Telescope,
    Tent,
    TentTree,
    Terminal,
    TerminalSquare,
    TestTube,
    TestTubeDiagonal,
    TestTubes,
    Text,
    TextCursor,
    TextCursorInput,
    TextQuote,
    TextSearch,
    TextSelect,
    Theater,
    Thermometer as ThermometerIcon,
    ThermometerSnowflake,
    ThermometerSun,
    ThumbsDown,
    ThumbsUp,
    Ticket,
    TicketCheck,
    TicketMinus,
    TicketPercent,
    TicketPlus,
    TicketSlash,
    TicketX,
    Timer,
    TimerOff,
    TimerReset,
    ToggleLeft,
    ToggleRight,
    Tornado,
    Torus,
    Touchpad,
    TouchpadOff,
    TowerControl,
    ToyBrick,
    Tractor,
    TrafficCone,
    Train,
    TrainFront,
    TrainFrontTunnel,
    TrainTrack,
    TramFront,
    Trash,
    Trash2 as Trash2Icon,
    TrashIcon,
    TreeDeciduous,
    TreePine,
    Trees,
    Trello,
    TrendingDown,
    TrendingUp as TrendingUpIcon,
    TrendingUpDown,
    Triangle,
    TriangleAlert,
    TriangleRight,
    Trophy,
    Truck as TruckIcon,
    Turtle,
    Tv,
    Tv2,
    TvMinimal,
    TvMinimalPlay,
    Twitch,
    Twitter,
    Type,
    Umbrella as UmbrellaIcon,
    UmbrellaOff,
    Underline,
    Undo,
    Undo2,
    UndoDot,
    UnfoldHorizontal,
    UnfoldVertical,
    Ungroup,
    University,
    Unlink,
    Unlink2,
    Unlock as UnlockIcon,
    Unplug,
    Upload,
    Usb,
    User,
    UserCheck,
    UserCog,
    UserMinus,
    UserPen,
    UserPlus,
    UserRound,
    UserRoundCheck,
    UserRoundCog,
    UserRoundMinus,
    UserRoundPen,
    UserRoundPlus,
    UserRoundSearch,
    UserRoundX,
    UserSearch,
    UserX,
    Users as UsersIcon,
    UsersRound,
    Utensils,
    UtensilsCrossed,
    UtilityPole,
    Variable,
    Vault,
    Vegan,
    VenetianMask,
    Vibrate,
    VibrateOff,
    Video as VideoIcon2,
    VideoOff as VideoOffIcon,
    Videotape,
    View,
    Voicemail,
    Volleyball,
    Volume as VolumeIcon,
    Volume1 as Volume1Icon,
    Volume2 as Volume2Icon,
    VolumeX as VolumeXIcon,
    Vote,
    Wallet,
    WalletCards,
    WalletMinimal,
    Wallpaper,
    Wand,
    WandSparkles,
    Warehouse,
    WashingMachine,
    Watch,
    Waves,
    Waypoints,
    Webcam,
    Webhook,
    WebhookOff,
    Weight,
    Wheat,
    WheatOff,
    WholeWord,
    Wifi as WifiIcon2,
    WifiHigh,
    WifiLow,
    WifiOff as WifiOffIcon,
    WifiZero,
    Wind as WindIcon,
    Wine,
    WineOff,
    Workflow,
    Worm,
    WrapText,
    Wrench,
    X as XIcon,
    XCircle as XCircleIcon,
    XOctagon,
    XSquare,
    Youtube,
    Zap as ZapIcon,
    ZapOff,
    Zebra,
    ZoomIn,
    ZoomOut
} from "lucide-react";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    BarChart as RechartsBarChart,
    Bar,
    ScatterChart as RechartsScatterChart,
    Scatter,
    ZAxis,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ComposedChart,
    FunnelChart,
    Funnel,
    LabelList
} from "recharts";

import {
    fetchOverview,
    fetchMoodDashboard,
    fetchHeatmap,
    fetchRiskMetrics,
    fetchCorrelation,
    fetchGrowthIndex,
    fetchRetreatAnalytics,
    fetchRetreatFunnel,
    fetchRetreats,
    fetchRetreatById,
    createRetreat,
    updateRetreat,
    deleteRetreat,
    toggleFeaturedRetreat,
    reorderRetreats,
    recalculateRetreatStats,
    fetchAlerts,
    loadWellnessPage,
    setWellnessDateRange,
    setIncludeInactive,
    setFunnelRetreatId,
    setSelectedRetreatId,
    setCorrelationFilters,
    setGrowthFilters,
    setAlertFilters,
    clearSectionError,
    invalidateWellnessCache
} from "../../store/slices/wellnessSlice";

import {
    selectMoodDashboard,
    selectHeatmap,
    selectRiskMetrics,
    selectCorrelation,
    selectGrowthIndex,
    selectRetreatAnalytics,
    selectRetreatFunnel,
    selectAllRetreats,
    selectSelectedRetreat,
    selectWellnessAlerts,
    selectWellnessOverview,
    selectWellnessLoading,
    selectWellnessErrors,
    selectWellnessFilters,
    selectCachedMoodDashboard,
    selectCachedOverview
} from "../../store/slices/wellnessSlice";

// ============================================================
// CONSTANTS & CONFIG
// ============================================================

const MOOD_COLORS = {
    veryLow: "#EF4444",
    low: "#F97316",
    medium: "#EAB308",
    high: "#22C55E",
    veryHigh: "#10B981"
};

const CHART_COLORS = [
    "#6A1B9A",
    "#8E24AA",
    "#9C27B0",
    "#AA4AB3",
    "#BA68C8",
    "#CE93D8",
    "#E1BEE7",
    "#F3E5F5"
];

const RETREAT_TYPES = [
    { value: "meditation", label: "Meditation" },
    { value: "yoga", label: "Yoga" },
    { value: "detox", label: "Detox" },
    { value: "digital", label: "Digital Detox" },
    { value: "wellness", label: "Wellness" },
    { value: "healing", label: "Healing" },
    { value: "spiritual", label: "Spiritual" },
    { value: "fitness", label: "Fitness" }
];

const RETREAT_LEVELS = [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
    { value: "all", label: "All Levels" }
];

const SEVERITY_CONFIG = {
    high: { bg: "bg-red-50", border: "border-red-500", icon: AlertTriangle, text: "text-red-700" },
    medium: { bg: "bg-yellow-50", border: "border-yellow-500", icon: AlertCircle, text: "text-yellow-700" },
    low: { bg: "bg-blue-50", border: "border-blue-500", icon: Info, text: "text-blue-700" }
};

const TIME_RANGES = [
    { value: 7, label: "7 days" },
    { value: 14, label: "14 days" },
    { value: 30, label: "30 days" },
    { value: 60, label: "60 days" },
    { value: 90, label: "90 days" }
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const formatNumber = (num, decimals = 1) => {
    if (num === undefined || num === null) return "-";
    return Number(num).toFixed(decimals);
};

const formatPercentage = (num, decimals = 1) => {
    if (num === undefined || num === null) return "-";
    return `${Number(num).toFixed(decimals)}%`;
};

const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
};

const getMoodColor = (value) => {
    if (value <= 2) return MOOD_COLORS.veryLow;
    if (value <= 3) return MOOD_COLORS.low;
    if (value <= 4) return MOOD_COLORS.medium;
    if (value <= 4.5) return MOOD_COLORS.high;
    return MOOD_COLORS.veryHigh;
};

const calculateVolatility = (values) => {
    if (!values || values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
};

const debounce = (fn, ms) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
};

// ============================================================
// SECTION WRAPPER
// ============================================================

const SectionWrapper = ({ title, description, actions, children, loading, error, onRetry }) => {
    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                        {description && (
                            <p className="text-sm text-gray-500 mt-1">{description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {actions}
                        {error && onRetry && (
                            <button
                                onClick={onRetry}
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                            >
                                <RefreshCw size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-6">
                {loading && !error ? (
                    <SkeletonLoader />
                ) : error ? (
                    <ErrorState message={error} onRetry={onRetry} />
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

// ============================================================
// SKELETON LOADER
// ============================================================

const SkeletonLoader = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-4 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
        </div>
    </div>
);

// ============================================================
// ERROR STATE
// ============================================================

const ErrorState = ({ message, onRetry }) => (
    <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Data</h3>
        <p className="mt-2 text-sm text-gray-500">{message || "Something went wrong"}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
            >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
            </button>
        )}
    </div>
);

// ============================================================
// KPI CARD
// ============================================================

const KpiCard = ({ icon, label, value, trend, trendLabel, subtitle, color = "purple" }) => {
    const colorClasses = {
        purple: "text-purple-600 bg-purple-50",
        green: "text-green-600 bg-green-50",
        red: "text-red-600 bg-red-50",
        yellow: "text-yellow-600 bg-yellow-50",
        blue: "text-blue-600 bg-blue-50"
    };

    return (
        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center text-sm ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span className="ml-1 font-medium">{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <div className="mt-4">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
                {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
            </div>
        </div>
    );
};

// ============================================================
// INFO CARD
// ============================================================

const InfoCard = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow p-6 ${className}`}>
        <h4 className="text-sm font-medium text-gray-500 mb-4">{title}</h4>
        {children}
    </div>
);

// ============================================================
// CHART CARD
// ============================================================

const ChartCard = ({ title, subtitle, children, height = 300, controls }) => (
    <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h4 className="font-semibold text-gray-700">{title}</h4>
                {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            </div>
            {controls && <div className="flex gap-2">{controls}</div>}
        </div>
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    </div>
);

// ============================================================
// ALERT CARD
// ============================================================

const AlertCard = ({ alert, onDismiss, onView }) => {
    const severity = alert.severity || "medium";
    const config = SEVERITY_CONFIG[severity];
    const Icon = config.icon;

    return (
        <div className={`rounded-xl shadow p-5 border-l-4 ${config.bg} ${config.border}`}>
            <div className="flex items-start justify-between">
                <div className="flex gap-3">
                    <Icon className={`h-5 w-5 ${config.text}`} />
                    <div>
                        <h4 className={`font-semibold ${config.text}`}>{alert.type}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <div className="flex gap-4 mt-3">
                            <span className="text-xs text-gray-500">
                                {new Date(alert.timestamp || Date.now()).toLocaleString()}
                            </span>
                            {alert.metadata && (
                                <span className="text-xs text-gray-500">
                                    Value: {alert.metadata.value}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {onView && (
                        <button
                            onClick={onView}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <Eye size={16} />
                        </button>
                    )}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============================================================
// RETREAT CARD
// ============================================================

const RetreatCard = ({
    retreat,
    onEdit,
    onDelete,
    onToggleFeatured,
    onRecalculate,
    onSelect,
    isSelected,
    loading
}) => {
    return (
        <div
            className={`bg-white rounded-xl shadow p-5 hover:shadow-lg transition-all cursor-pointer ${isSelected ? "ring-2 ring-purple-600" : ""
                }`}
            onClick={() => onSelect?.(retreat._id)}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-800">{retreat.title}</h4>
                        {retreat.isFeatured && (
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        )}
                        {!retreat.isActive && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                Inactive
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{retreat.category}</p>
                    <div className="flex gap-4 mt-3">
                        <span className="text-xs text-gray-400">
                            Instructor: {retreat.instructor || "TBD"}
                        </span>
                        <span className="text-xs text-gray-400">
                            Duration: {retreat.duration || 30} min
                        </span>
                        <span className="text-xs text-gray-400">
                            Level: {retreat.level || "beginner"}
                        </span>
                    </div>
                    {retreat.completionRate !== undefined && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Completion Rate</span>
                                <span className="font-medium">{formatPercentage(retreat.completionRate)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-600 rounded-full"
                                    style={{ width: `${retreat.completionRate || 0}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 ml-4">
                    <ActionButton
                        icon={<Edit size={16} />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(retreat);
                        }}
                        disabled={loading}
                        tooltip="Edit"
                    />
                    <ActionButton
                        icon={<Star size={16} />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFeatured(retreat._id);
                        }}
                        disabled={loading}
                        tooltip={retreat.isFeatured ? "Remove Featured" : "Mark Featured"}
                        variant={retreat.isFeatured ? "yellow" : "default"}
                    />
                    <ActionButton
                        icon={<RefreshCw size={16} />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onRecalculate(retreat._id);
                        }}
                        disabled={loading}
                        tooltip="Recalculate Stats"
                    />
                    <ActionButton
                        icon={<Trash2 size={16} />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(retreat._id);
                        }}
                        disabled={loading}
                        variant="danger"
                        tooltip="Delete"
                    />
                </div>
            </div>
        </div>
    );
};

// ============================================================
// ACTION BUTTON
// ============================================================

const ActionButton = ({ icon, onClick, disabled, tooltip, variant = "default" }) => {
    const variants = {
        default: "bg-gray-100 hover:bg-gray-200 text-gray-600",
        danger: "bg-red-50 hover:bg-red-100 text-red-600",
        yellow: "bg-yellow-50 hover:bg-yellow-100 text-yellow-600",
        purple: "bg-purple-50 hover:bg-purple-100 text-purple-600"
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`p-2 rounded-lg transition-colors ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
            title={tooltip}
        >
            {icon}
        </button>
    );
};

// ============================================================
// FILTER BAR
// ============================================================

const FilterBar = ({ filters, onChange, onApply, onReset }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Filters</span>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>

            {isOpen && (
                <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {filters.map((filter, index) => (
                            <div key={index}>
                                <label className="block text-xs text-gray-500 mb-1">
                                    {filter.label}
                                </label>
                                {filter.type === "select" ? (
                                    <select
                                        value={filter.value}
                                        onChange={(e) => onChange(filter.key, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                    >
                                        {filter.options.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : filter.type === "range" ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={filter.value[0]}
                                            onChange={(e) => onChange(filter.key, [Number(e.target.value), filter.value[1]])}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                            min={filter.min}
                                            max={filter.max}
                                        />
                                        <span>-</span>
                                        <input
                                            type="number"
                                            value={filter.value[1]}
                                            onChange={(e) => onChange(filter.key, [filter.value[0], Number(e.target.value)])}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                            min={filter.min}
                                            max={filter.max}
                                        />
                                    </div>
                                ) : (
                                    <input
                                        type={filter.type || "text"}
                                        value={filter.value}
                                        onChange={(e) => onChange(filter.key, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        placeholder={filter.placeholder}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onReset}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Reset
                        </button>
                        <button
                            onClick={onApply}
                            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================
// TABS
// ============================================================

const Tabs = ({ tabs, activeTab, onChange }) => {
    return (
        <div className="flex gap-1 bg-white p-1 rounded-xl shadow">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? "bg-purple-600 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <Icon size={16} />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};

// ============================================================
// MODAL
// ============================================================

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
    if (!isOpen) return null;

    const sizes = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl"
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-2xl shadow-xl ${sizes[size]} w-full mx-4`}>
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

// ============================================================
// CONFIRM DIALOG
// ============================================================

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", variant = "danger" }) => {
    if (!isOpen) return null;

    const variants = {
        danger: {
            confirm: "bg-red-600 hover:bg-red-700",
            icon: AlertTriangle
        },
        warning: {
            confirm: "bg-yellow-600 hover:bg-yellow-700",
            icon: AlertCircle
        },
        info: {
            confirm: "bg-blue-600 hover:bg-blue-700",
            icon: Info
        }
    };

    const Icon = variants[variant].icon;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-red-50 rounded-full">
                            <Icon className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    </div>
                    <p className="text-gray-600">{message}</p>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-4 py-2 text-white rounded-lg ${variants[variant].confirm}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// THRESHOLD SLIDER
// ============================================================

const ThresholdSlider = ({ label, value, onChange, min = 0, max = 100, unit = "%" }) => {
    return (
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm text-gray-600">{label}</label>
                <span className="text-sm font-medium text-purple-600">
                    {value}{unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
        </div>
    );
};

// ============================================================
// FUNNEL CHART
// ============================================================

const FunnelChartComponent = ({ data }) => {
    if (!data || data.length === 0) {
        return <EmptyState message="No funnel data available" />;
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
                <Funnel
                    dataKey="value"
                    data={data}
                    isAnimationActive
                    labelLine
                    label={{
                        fill: "#374151",
                        fontSize: 12,
                        position: "inside"
                    }}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                    <LabelList dataKey="name" fill="#fff" stroke="none" position="right" />
                </Funnel>
                <Tooltip />
            </FunnelChart>
        </ResponsiveContainer>
    );
};

// ============================================================
// HEATMAP GRID
// ============================================================

const HeatmapGrid = ({ data, days = 30 }) => {
    const safeData = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

    if (safeData.length === 0) {
        return <EmptyState message="No heatmap data available" />;
    }

    const cells = safeData.slice(-days).map((item) => ({
        day: new Date(item.date).toLocaleDateString(),
        value: item.avgMood || 0,
        count: item.count || 0
    }));

    const maxValue = Math.max(...cells.map(c => c.value), 1);

    const getColor = (value) => {
        if (value === 0) return "bg-gray-100";

        const intensity = Math.floor((value / maxValue) * 100);
        const shade = Math.min(Math.floor(intensity / 10) * 100 + 100, 900);

        return `bg-purple-${shade}`;
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-xs text-gray-400 text-center py-2">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, index) => (
                    <div
                        key={index}
                        className={`aspect-square rounded ${getColor(cell.value)} hover:ring-2 hover:ring-purple-400 cursor-pointer group relative`}
                    >
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                            {cell.day}: {cell.value.toFixed(1)} ({cell.count} entries)
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================
// LOADING OVERLAY
// ============================================================

const LoadingOverlay = ({ isLoading, children }) => {
    if (!isLoading) return children;

    return (
        <div className="relative">
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading...</p>
                </div>
            </div>
            <div className="opacity-50 pointer-events-none">
                {children}
            </div>
        </div>
    );
};

// ============================================================
// EMPTY STATE
// ============================================================

const EmptyState = ({ message, icon: Icon = Database }) => (
    <div className="text-center py-12">
        <Icon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-sm text-gray-500">{message}</p>
    </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Wellness() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    // Selectors
    const overview = useSelector(selectWellnessOverview);
    const moodDashboard = useSelector(selectMoodDashboard);
    const heatmap = useSelector(selectHeatmap);
    const riskMetrics = useSelector(selectRiskMetrics);
    const correlation = useSelector(selectCorrelation);
    const growthIndex = useSelector(selectGrowthIndex);
    const retreatAnalytics = useSelector(selectRetreatAnalytics);
    const retreatFunnel = useSelector(selectRetreatFunnel);
    const retreats = useSelector(selectAllRetreats);
    const alerts = useSelector(selectWellnessAlerts);
    const loading = useSelector(selectWellnessLoading);
    const errors = useSelector(selectWellnessErrors);
    const filters = useSelector(selectWellnessFilters);

    const token = useSelector((state) => state.auth.token);

    // Local state
    const [activeTab, setActiveTab] = useState("overview");
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedRetreat, setSelectedRetreat] = useState(null);
    const [editingRetreat, setEditingRetreat] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [localDateRange, setLocalDateRange] = useState({ days: 30, from: null, to: null });
    const [localThresholds, setLocalThresholds] = useState(filters.alerts);
    const [showInactive, setShowInactive] = useState(filters.includeInactive);
    const [retreatSearch, setRetreatSearch] = useState("");
    const [retreatType, setRetreatType] = useState("all");
    const [retreatLevel, setRetreatLevel] = useState("all");

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        instructor: "",
        type: "meditation",
        level: "beginner",
        duration: 30,
        category: "",
        price: 0,
        maxParticipants: 20,
        location: "",
        startDate: "",
        endDate: "",
        isActive: true,
        isFeatured: false
    });

    // ============================================================
    // EFFECTS
    // ============================================================

    useEffect(() => {
        if (!token) return;

        // Load initial data
        dispatch(loadWellnessPage({ token }));
    }, [dispatch, token]);

    // Apply filters effect
    useEffect(() => {
        if (!token) return;

        const params = {
            days: localDateRange.days,
            from: localDateRange.from,
            to: localDateRange.to
        };

        const debouncedFetch = debounce(() => {
            dispatch(fetchOverview({ params, token }));
            dispatch(fetchMoodDashboard({ params, token }));
            dispatch(fetchHeatmap({ params: { ...params, tzOffsetMin: filters.tzOffsetMin }, token }));
            dispatch(fetchRiskMetrics({ params, token }));
        }, 500);

        debouncedFetch();

        return () => debouncedFetch.cancel?.();
    }, [dispatch, token, localDateRange, filters.tzOffsetMin]);

    // ============================================================
    // HANDLERS
    // ============================================================

    const handleDateRangeChange = (days) => {
        setLocalDateRange({ days, from: null, to: null });
        dispatch(setWellnessDateRange({ days }));
    };

    const handleIncludeInactiveChange = (value) => {
        setShowInactive(value);
        dispatch(setIncludeInactive(value));
    };

    const handleFunnelRetreatChange = (retreatId) => {
        dispatch(setFunnelRetreatId(retreatId));
        dispatch(fetchRetreatFunnel({ params: { retreatId }, token }));
    };

    const handleThresholdChange = (key, value) => {
        setLocalThresholds(prev => ({ ...prev, [key]: value }));
    };

    const handleApplyThresholds = () => {
        dispatch(setAlertFilters(localThresholds));
        dispatch(fetchAlerts({ params: localThresholds, token }));
    };

    const handleRefreshSection = (section) => {
        switch (section) {
            case "overview":
                dispatch(fetchOverview({ params: localDateRange, token }));
                break;
            case "mood":
                dispatch(fetchMoodDashboard({ params: localDateRange, token }));
                break;
            case "heatmap":
                dispatch(fetchHeatmap({ params: { ...localDateRange, tzOffsetMin: filters.tzOffsetMin }, token }));
                break;
            case "risk":
                dispatch(fetchRiskMetrics({ params: localDateRange, token }));
                break;
            case "retreats":
                dispatch(fetchRetreats({ params: { includeInactive: showInactive }, token }));
                break;
            case "alerts":
                dispatch(fetchAlerts({ params: localThresholds, token }));
                break;
            default:
                dispatch(loadWellnessPage({ token }));
        }
    };

    const handleInvalidateCache = (section) => {
        dispatch(invalidateWellnessCache(section));
        handleRefreshSection(section);
    };

    // Retreat CRUD handlers
    const handleCreateRetreat = () => {
        setIsCreateModalOpen(true);
        setEditingRetreat(null);
        setFormData({
            title: "",
            description: "",
            instructor: "",
            type: "meditation",
            level: "beginner",
            duration: 30,
            category: "",
            price: 0,
            maxParticipants: 20,
            location: "",
            startDate: "",
            endDate: "",
            isActive: true,
            isFeatured: false
        });
    };

    const handleEditRetreat = (retreat) => {
        setEditingRetreat(retreat);
        setFormData(retreat);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (id) => {
        setDeleteTarget(id);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (deleteTarget) {
            dispatch(deleteRetreat({ id: deleteTarget, token }));
            setIsDeleteDialogOpen(false);
            setDeleteTarget(null);
        }
    };

    const handleToggleFeatured = (id) => {
        dispatch(toggleFeaturedRetreat({ id, token }));
    };

    const handleRecalculateStats = (id) => {
        dispatch(recalculateRetreatStats({ id, token }));
    };

    const handleSelectRetreat = (id) => {
        setSelectedRetreat(id);
        dispatch(setSelectedRetreatId(id));
        dispatch(fetchRetreatById({ id, token }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();

        if (editingRetreat) {
            dispatch(updateRetreat({ id: editingRetreat._id, data: formData, token }));
        } else {
            dispatch(createRetreat({ data: formData, token }));
        }

        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setEditingRetreat(null);
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Filtered retreats
    const filteredRetreats = useMemo(() => {
        return retreats.filter(r => {
            if (!showInactive && !r.isActive) return false;
            if (retreatSearch && !r.title?.toLowerCase().includes(retreatSearch.toLowerCase())) return false;
            if (retreatType !== "all" && r.type !== retreatType) return false;
            if (retreatLevel !== "all" && r.level !== retreatLevel) return false;
            return true;
        });
    }, [retreats, showInactive, retreatSearch, retreatType, retreatLevel]);

    // ============================================================
    // TABS CONFIG
    // ============================================================

    const tabs = [
        { id: "overview", label: "Overview", icon: Activity },
        { id: "mood", label: "Mood Intelligence", icon: Brain },
        { id: "retreats", label: "Retreat Analytics", icon: Users },
        { id: "management", label: "Retreat Management", icon: Settings },
        { id: "insights", label: "Advanced Insights", icon: TrendingUp },
    ];

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-8 pb-12">

                {/* Header */}
                <div className="bg-gradient-to-br from-purple-900 to-purple-700 rounded-2xl shadow-xl p-8 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold">Wellness Intelligence</h1>
                            <p className="text-purple-100 mt-2 max-w-2xl">
                                Comprehensive emotional analytics and retreat performance insights with real-time monitoring
                            </p>
                        </div>
                        <button
                            onClick={() => handleRefreshSection("all")}
                            className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
                        <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-purple-200 text-xs">Avg Mood</p>
                            <p className="text-2xl font-bold">{formatNumber(overview?.moodDashboard?.totals?.avgMood)}</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-purple-200 text-xs">Growth Score</p>
                            <p className="text-2xl font-bold">{formatNumber(growthIndex?.growthScore)}</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-purple-200 text-xs">Completion Rate</p>
                            <p className="text-2xl font-bold">{formatPercentage(overview?.retreatAnalytics?.avgCompletionRate)}</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-purple-200 text-xs">Active Retreats</p>
                            <p className="text-2xl font-bold">{retreats.filter(r => r.isActive).length}</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-purple-200 text-xs">Active Alerts</p>
                            <p className="text-2xl font-bold">{alerts?.alerts?.length || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

                {/* ======================================================
            OVERVIEW TAB
        ====================================================== */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Date Range Filter */}
                        <div className="bg-white rounded-xl shadow p-4">
                            <div className="flex items-center gap-4">
                                <Calendar size={18} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">Date Range:</span>
                                <div className="flex gap-2">
                                    {TIME_RANGES.map(range => (
                                        <button
                                            key={range.value}
                                            onClick={() => handleDateRangeChange(range.value)}
                                            className={`px-3 py-1 rounded-lg text-sm ${localDateRange.days === range.value
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                        >
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KpiCard
                                icon={<Heart size={24} />}
                                label="Average Mood"
                                value={formatNumber(overview?.moodDashboard?.totals?.avgMood)}
                                trend={growthIndex?.improvementRate}
                                subtitle={`${overview?.moodDashboard?.totals?.totalEntries || 0} entries`}
                                color="purple"
                            />
                            <KpiCard
                                icon={<Zap size={24} />}
                                label="Volatility Index"
                                value={formatNumber(riskMetrics?.volatility?.overall)}
                                subtitle={`Peak: ${formatNumber(riskMetrics?.volatility?.peak)}`}
                                color="yellow"
                            />
                            <KpiCard
                                icon={<TrendingUp size={24} />}
                                label="Growth Score"
                                value={formatNumber(growthIndex?.growthScore)}
                                subtitle={`Delta: ${formatNumber(growthIndex?.avgDelta)}`}
                                color="green"
                            />
                            <KpiCard
                                icon={<Users size={24} />}
                                label="Active Retreats"
                                value={retreats.filter(r => r.isActive).length}
                                subtitle={`${retreats.filter(r => r.isFeatured).length} featured`}
                                color="blue"
                            />
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard
                                title="Mood Trend"
                                subtitle="Daily average mood scores"
                                height={300}
                                controls={
                                    <button
                                        onClick={() => handleRefreshSection("overview")}
                                        className="p-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                }
                            >
                                <LineChart data={overview?.moodDashboard?.dailyTrend || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="_id"
                                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                        stroke="#9CA3AF"
                                    />
                                    <YAxis domain={[1, 5]} stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "white",
                                            borderRadius: "8px",
                                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avgMood"
                                        stroke="#6A1B9A"
                                        strokeWidth={3}
                                        dot={{ fill: "#6A1B9A", r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ChartCard>

                            <ChartCard title="Completion Rate Trend" height={300}>
                                <AreaChart data={overview?.retreatAnalytics?.dailyCompletion || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" />
                                    <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                                    <Tooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="rate"
                                        stroke="#8E24AA"
                                        fill="#BA68C8"
                                        fillOpacity={0.3}
                                    />
                                </AreaChart>
                            </ChartCard>

                            <ChartCard title="Engagement Distribution" height={300}>
                                <RechartsBarChart data={overview?.moodDashboard?.distribution || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="label" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#6A1B9A" radius={[4, 4, 0, 0]}>
                                        {(overview?.moodDashboard?.distribution || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getMoodColor(entry.value)} />
                                        ))}
                                    </Bar>
                                </RechartsBarChart>
                            </ChartCard>

                            <ChartCard title="Correlation Summary" height={300}>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Mood vs Participation</span>
                                        <span className="text-lg font-semibold text-purple-600">
                                            {formatNumber(correlation?.moodVsParticipation, 2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Retreat Impact</span>
                                        <span className="text-lg font-semibold text-purple-600">
                                            {formatNumber(correlation?.retreatImpact, 2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-600">Seasonality Factor</span>
                                        <span className="text-lg font-semibold text-purple-600">
                                            {formatNumber(correlation?.seasonality, 2)}
                                        </span>
                                    </div>
                                </div>
                            </ChartCard>
                        </div>
                    </div>
                )}

                {/* ======================================================
            MOOD INTELLIGENCE TAB
        ====================================================== */}
                {activeTab === "mood" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <KpiCard
                                icon={<Activity size={24} />}
                                label="Current Mood"
                                value={formatNumber(moodDashboard?.currentAvg)}
                                subtitle="Last 24 hours"
                                color="purple"
                            />
                            <KpiCard
                                icon={<Zap size={24} />}
                                label="Volatility"
                                value={formatNumber(riskMetrics?.volatility?.current)}
                                subtitle={`Baseline: ${formatNumber(riskMetrics?.volatility?.baseline)}`}
                                color="yellow"
                            />
                            <KpiCard
                                icon={<TrendingUp size={24} />}
                                label="Growth Index"
                                value={formatNumber(growthIndex?.currentIndex)}
                                subtitle={`Improvement: ${formatPercentage(growthIndex?.improvementRate)}`}
                                color="green"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Mood Distribution" height={300}>
                                <RechartsPieChart>
                                    <Pie
                                        data={moodDashboard?.distribution || []}
                                        dataKey="count"
                                        nameKey="label"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {(moodDashboard?.distribution || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getMoodColor(entry.value)} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </RechartsPieChart>
                            </ChartCard>

                            <ChartCard title="Volatility Analysis" height={300}>
                                <LineChart data={riskMetrics?.dailyVolatility || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="volatility" stroke="#EF4444" />
                                    <Line type="monotone" dataKey="threshold" stroke="#9CA3AF" strokeDasharray="5 5" />
                                </LineChart>
                            </ChartCard>

                            <ChartCard title="Before vs After Retreat" height={300}>
                                <RechartsBarChart data={correlation?.retreatComparison || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="before" fill="#9CA3AF" />
                                    <Bar dataKey="after" fill="#6A1B9A" />
                                </RechartsBarChart>
                            </ChartCard>

                            <ChartCard title="Heatmap" height={300}>
                                <HeatmapGrid data={heatmap || []} days={30} />
                            </ChartCard>
                        </div>

                        {/* Correlation Filters */}
                        <SectionWrapper title="Correlation Analysis" description="Advanced correlation filters">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Window Days</label>
                                    <input
                                        type="number"
                                        value={filters.correlation.days}
                                        onChange={(e) => dispatch(setCorrelationFilters({ days: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Before Days</label>
                                    <input
                                        type="number"
                                        value={filters.correlation.beforeDays}
                                        onChange={(e) => dispatch(setCorrelationFilters({ beforeDays: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">After Days</label>
                                    <input
                                        type="number"
                                        value={filters.correlation.afterDays}
                                        onChange={(e) => dispatch(setCorrelationFilters({ afterDays: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-2">Min Samples</label>
                                    <input
                                        type="number"
                                        value={filters.correlation.minSamples}
                                        onChange={(e) => dispatch(setCorrelationFilters({ minSamples: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                            </div>
                        </SectionWrapper>
                    </div>
                )}

                {/* ======================================================
            RETREAT ANALYTICS TAB
        ====================================================== */}
                {activeTab === "retreats" && (
                    <div className="space-y-6">
                        {/* Controls */}
                        <div className="bg-white rounded-xl shadow p-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600">Include Inactive:</label>
                                    <input
                                        type="checkbox"
                                        checked={showInactive}
                                        onChange={(e) => handleIncludeInactiveChange(e.target.checked)}
                                        className="rounded text-purple-600"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600">Retreat:</label>
                                    <select
                                        value={filters.funnelRetreatId || ""}
                                        onChange={(e) => handleFunnelRetreatChange(e.target.value || null)}
                                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                    >
                                        <option value="">Platform Wide</option>
                                        {retreats.map(r => (
                                            <option key={r._id} value={r._id}>{r.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={() => dispatch(fetchRetreatAnalytics({ params: { includeInactive: showInactive }, token }))}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>

                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <KpiCard
                                icon={<Users size={24} />}
                                label="Total Participants"
                                value={retreatAnalytics?.totals?.participants || 0}
                                color="purple"
                            />
                            <KpiCard
                                icon={<Activity size={24} />}
                                label="Avg Completion"
                                value={formatPercentage(retreatAnalytics?.avgCompletionRate)}
                                color="green"
                            />
                            <KpiCard
                                icon={<Star size={24} />}
                                label="Featured Avg"
                                value={formatPercentage(retreatAnalytics?.featuredAvgCompletion)}
                                color="yellow"
                            />
                            <KpiCard
                                icon={<TrendingUp size={24} />}
                                label="Growth Rate"
                                value={formatPercentage(retreatAnalytics?.participationGrowth)}
                                color="blue"
                            />
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Retention Funnel" height={400}>
                                <FunnelChartComponent data={retreatFunnel?.funnel || []} />
                            </ChartCard>

                            <ChartCard title="Completion by Category" height={400}>
                                <RechartsBarChart data={retreatAnalytics?.byCategory || []} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 100]} />
                                    <YAxis type="category" dataKey="category" />
                                    <Tooltip />
                                    <Bar dataKey="completionRate" fill="#6A1B9A" />
                                </RechartsBarChart>
                            </ChartCard>

                            <ChartCard title="Featured vs Non-featured" height={300}>
                                <RechartsBarChart data={[
                                    { name: "Featured", value: retreatAnalytics?.featuredAvgCompletion },
                                    { name: "Non-featured", value: retreatAnalytics?.nonFeaturedAvgCompletion }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#6A1B9A" />
                                </RechartsBarChart>
                            </ChartCard>

                            <ChartCard title="Participation Growth" height={300}>
                                <AreaChart data={retreatAnalytics?.dailyParticipation || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" stroke="#6A1B9A" fill="#BA68C8" fillOpacity={0.3} />
                                </AreaChart>
                            </ChartCard>
                        </div>
                    </div>
                )}

                {/* ======================================================
            RETREAT MANAGEMENT TAB
        ====================================================== */}
                {activeTab === "management" && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <div className="flex gap-4 flex-1">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search retreats..."
                                        value={retreatSearch}
                                        onChange={(e) => setRetreatSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                                <select
                                    value={retreatType}
                                    onChange={(e) => setRetreatType(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg"
                                >
                                    <option value="all">All Types</option>
                                    {RETREAT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={retreatLevel}
                                    onChange={(e) => setRetreatLevel(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg"
                                >
                                    <option value="all">All Levels</option>
                                    {RETREAT_LEVELS.map(l => (
                                        <option key={l.value} value={l.value}>{l.label}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleCreateRetreat}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700"
                            >
                                <Plus size={18} />
                                Add Retreat
                            </button>
                        </div>

                        {/* Retreat List */}
                        <LoadingOverlay isLoading={loading.retreatsList}>
                            <div className="grid gap-4">
                                {filteredRetreats.map((retreat) => (
                                    <RetreatCard
                                        key={retreat._id}
                                        retreat={retreat}
                                        onEdit={handleEditRetreat}
                                        onDelete={handleDeleteClick}
                                        onToggleFeatured={handleToggleFeatured}
                                        onRecalculate={handleRecalculateStats}
                                        onSelect={handleSelectRetreat}
                                        isSelected={selectedRetreat === retreat._id}
                                        loading={loading.retreatUpdate || loading.retreatDelete}
                                    />
                                ))}

                                {filteredRetreats.length === 0 && (
                                    <EmptyState message="No retreats found" />
                                )}
                            </div>
                        </LoadingOverlay>
                    </div>
                )}

                {/* ======================================================
            ADVANCED INSIGHTS TAB
        ====================================================== */}
                {activeTab === "insights" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Mood vs Retreat Participation" height={400}>
                                <RechartsScatterChart>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="participation" name="Participation" />
                                    <YAxis dataKey="mood" name="Mood" domain={[1, 5]} />
                                    <ZAxis dataKey="count" range={[50, 400]} />
                                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                                    <Scatter name="Data Points" data={correlation?.scatterData || []} fill="#6A1B9A" />
                                </RechartsScatterChart>
                            </ChartCard>

                            <ChartCard title="Improvement Distribution" height={400}>
                                <RechartsBarChart data={growthIndex?.distribution || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="range" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#6A1B9A" />
                                </RechartsBarChart>
                            </ChartCard>

                            <ChartCard title="Wellness Radar" height={400}>
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={correlation?.radarData || []}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="category" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    <Radar name="Current" dataKey="current" stroke="#6A1B9A" fill="#6A1B9A" fillOpacity={0.6} />
                                    <Radar name="Baseline" dataKey="baseline" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.3} />
                                    <Legend />
                                </RadarChart>
                            </ChartCard>

                            <ChartCard title="Growth Trajectory" height={400}>
                                <ComposedChart data={growthIndex?.trajectory || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" />
                                    <Tooltip />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="actual" fill="#6A1B9A" />
                                    <Line yAxisId="right" type="monotone" dataKey="projected" stroke="#EF4444" strokeDasharray="5 5" />
                                </ComposedChart>
                            </ChartCard>
                        </div>
                    </div>
                )}

            </div>

            {/* ============================================================
          MODALS
      ============================================================ */}

            {/* Create/Edit Retreat Modal */}
            <Modal
                isOpen={isCreateModalOpen || isEditModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingRetreat(null);
                }}
                title={editingRetreat ? "Edit Retreat" : "Create Retreat"}
                size="lg"
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleFormChange("title", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => handleFormChange("category", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleFormChange("description", e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Instructor</label>
                            <input
                                type="text"
                                value={formData.instructor}
                                onChange={(e) => handleFormChange("instructor", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Location</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => handleFormChange("location", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => handleFormChange("type", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            >
                                {RETREAT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Level</label>
                            <select
                                value={formData.level}
                                onChange={(e) => handleFormChange("level", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            >
                                {RETREAT_LEVELS.map(l => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Duration (min)</label>
                            <input
                                type="number"
                                value={formData.duration}
                                onChange={(e) => handleFormChange("duration", Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                min={1}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Price ($)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => handleFormChange("price", Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                min={0}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Max Participants</label>
                            <input
                                type="number"
                                value={formData.maxParticipants}
                                onChange={(e) => handleFormChange("maxParticipants", Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                min={1}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => handleFormChange("startDate", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">End Date</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => handleFormChange("endDate", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => handleFormChange("isActive", e.target.checked)}
                                className="rounded text-purple-600"
                            />
                            <span className="text-sm text-gray-600">Active</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.isFeatured}
                                onChange={(e) => handleFormChange("isFeatured", e.target.checked)}
                                className="rounded text-purple-600"
                            />
                            <span className="text-sm text-gray-600">Featured</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                setIsEditModalOpen(false);
                                setEditingRetreat(null);
                            }}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading.retreatCreate || loading.retreatUpdate}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                            {loading.retreatCreate || loading.retreatUpdate ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setDeleteTarget(null);
                }}
                onConfirm={handleDeleteConfirm}
                title="Delete Retreat"
                message="Are you sure you want to delete this retreat? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </AdminLayout>
    );
}