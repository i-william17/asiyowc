const Event = require("../models/Event.js");

/* =====================================================
   HELPERS
===================================================== */

const notFound = (res, msg = "Not found") =>
    res.status(404).json({ message: msg });

const forbidden = (res) =>
    res.status(403).json({ message: "Not allowed" });

const serverError = (res, err) =>
    res.status(500).json({ message: err.message });


/* =====================================================
   GET ALL EVENTS (PUBLIC)
   + pagination
   + isRegistered flag
===================================================== */
exports.getEvents = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const query = { status: "published" };

        const events = await Event.find(query)
            .populate("organizer", "profile.fullName profile.avatar")
            .sort({ "dateTime.start": 1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const userId = req.user?.id;

        // attach frontend helpers
        const mapped = events.map(e => ({
            ...e.toObject(),
            isRegistered: userId
                ? e.attendees.some(a => a.user.toString() === userId)
                : false,
            attendeeCount: e.registrationCount
        }));

        const total = await Event.countDocuments(query);

        res.json({
            page,
            pages: Math.ceil(total / limit),
            total,
            events: mapped
        });

    } catch (err) {
        serverError(res, err);
    }
};


/* =====================================================
   GET SINGLE
===================================================== */
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate("organizer", "profile.fullName profile.avatar")
            .populate("speakers.user", "profile.fullName profile.avatar");

        if (!event) return res.status(404).json({ message: "Event not found" });

        res.json(event);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


/* =====================================================
   CREATE EVENT
===================================================== */
exports.createEvent = async (req, res) => {
    try {
        const event = await Event.create({
            ...req.body,
            organizer: req.user.id,
            status: "draft"
        });

        res.status(201).json(event);

    } catch (err) {
        serverError(res, err);
    }
};


/* =====================================================
   UPDATE EVENT
===================================================== */
exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) return notFound(res);
        if (event.organizer.toString() !== req.user.id)
            return forbidden(res);

        Object.assign(event, req.body);

        await event.save();

        res.json(event);

    } catch (err) {
        serverError(res, err);
    }
};


/* =====================================================
   DELETE EVENT
===================================================== */
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) return notFound(res);
        if (event.organizer.toString() !== req.user.id)
            return forbidden(res);

        await event.deleteOne();

        res.json({ message: "Event deleted" });

    } catch (err) {
        serverError(res, err);
    }
};


/* =====================================================
   RSVP
===================================================== */
exports.rsvpEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        event.registerAttendee(req.user.id);

        await event.save();

        res.json({
            success: true,
            message: "RSVP successful",
            attendees: event.registrationCount
        });

    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};


/* =====================================================
   CANCEL RSVP
===================================================== */
exports.cancelRsvp = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) return notFound(res);

        event.attendees = event.attendees.filter(
            a => a.user.toString() !== req.user.id
        );

        await event.save();

        res.json({ message: "RSVP cancelled" });

    } catch (err) {
        serverError(res, err);
    }
};


/* =====================================================
   CHECK-IN
===================================================== */
exports.checkIn = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) return notFound(res);

        event.checkInAttendee(req.user.id);

        await event.save();

        res.json({ message: "Checked in successfully" });

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};


/* =====================================================
   MY REGISTERED EVENTS
===================================================== */
exports.getMyEvents = async (req, res) => {
    try {
        const events = await Event.find({
            "attendees.user": req.user.id
        }).sort({ "dateTime.start": 1 });

        res.json(events);

    } catch (err) {
        serverError(res, err);
    }
};


/* =====================================================
   EVENTS I ORGANIZE
===================================================== */
exports.getOrganizerEvents = async (req, res) => {
    try {
        const events = await Event.find({
            organizer: req.user.id
        }).sort({ createdAt: -1 });

        res.json(events);

    } catch (err) {
        serverError(res, err);
    }
};
