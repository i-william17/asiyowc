const Event = require("../models/Event");

/* =====================================================
   RESPONSE HELPERS
===================================================== */

const ok = (res, data = null, message = null, extra = {}) =>
    res.json({ success: true, message, data, ...extra });

const created = (res, data = null, message = null) =>
    res.status(201).json({ success: true, message, data });

const bad = (res, message = "Bad request") =>
    res.status(400).json({ success: false, message });

const notFound = (res, message = "Not found") =>
    res.status(404).json({ success: false, message });

/* =====================================================
   1️⃣ LIST EVENTS (ADMIN VIEW)
   GET /api/admin/events
===================================================== */
exports.listEvents = async (req, res) => {
    try {
        const {
            search,
            status,
            page = 1,
            limit = 20,
        } = req.query;

        const query = {};

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const events = await Event.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Event.countDocuments(query);

        return res.json({
            success: true,
            data: events,
            page: Number(page),
            pages: Math.ceil(total / limit),
            total,
            limit: Number(limit),
        });

    } catch (err) {
        console.error("List Events Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch events",
        });
    }
};

/* =====================================================
   2️⃣ GET SINGLE EVENT DETAILS (ADMIN VIEW)
   GET /api/admin/events/:id
===================================================== */
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate({
                path: "attendees.user",
                select: "profile.fullName profile.avatar email",
            });

        if (!event) return notFound(res, "Event not found");

        return ok(res, event);
    } catch (err) {
        return bad(res, "Failed to fetch event");
    }
};

/* =====================================================
   3️⃣ CREATE EVENT (ADMIN)
   POST /api/admin/events
===================================================== */
exports.createEvent = async (req, res) => {
    try {
        const eventData = req.body;

        if (!eventData.title) {
            return bad(res, "Event title is required");
        }

        const event = await Event.create(eventData);

        return created(res, event, "Event created successfully");
    } catch (err) {
        console.error("Create Event Error:", err);
        return bad(res, err.message || "Failed to create event");
    }
};

/* =====================================================
   4️⃣ UPDATE EVENT (ADMIN)
   PUT /api/admin/events/:id
===================================================== */
exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findByIdAndUpdate(
            id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!event) {
            return notFound(res, "Event not found");
        }

        return ok(res, event, "Event updated successfully");
    } catch (err) {
        console.error("Update Event Error:", err);
        return bad(res, err.message || "Failed to update event");
    }
};

/* =====================================================
   5️⃣ DELETE EVENT (ADMIN)
   DELETE /api/admin/events/:id
===================================================== */
exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findByIdAndDelete(id);

        if (!event) {
            return notFound(res, "Event not found");
        }

        return ok(res, null, "Event deleted successfully");
    } catch (err) {
        console.error("Delete Event Error:", err);
        return bad(res, "Failed to delete event");
    }
};
