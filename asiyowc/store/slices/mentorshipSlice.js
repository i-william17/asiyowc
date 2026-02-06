import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mentorService } from "../../services/mentorship";


/* ============================================================
   INITIAL STATE
============================================================ */

const initialState = {
  mentors: [],
  selectedMentor: null,
  stories: [],
  myProfile: null,
  pendingMentors: [],

  loading: false,
  error: null,
};



/* ============================================================
   PUBLIC THUNKS
============================================================ */

/* Fetch verified mentors */
export const fetchMentors = createAsyncThunk(
  "mentorship/fetchMentors",
  async (params, thunkAPI) => {
    try {
      return await mentorService.getMentors(params);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


/* Fetch single mentor */
export const fetchMentorById = createAsyncThunk(
  "mentorship/fetchMentorById",
  async (mentorId, thunkAPI) => {
    try {
      return await mentorService.getMentorById(mentorId);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


/* Fetch mentor stories */
export const fetchMentorStories = createAsyncThunk(
  "mentorship/fetchMentorStories",
  async (mentorId, thunkAPI) => {
    try {
      return await mentorService.getMentorStories(mentorId);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);



/* ============================================================
   PROFILE / APPLY
============================================================ */

export const applyMentor = createAsyncThunk(
  "mentorship/applyMentor",
  async ({ payload, token }, thunkAPI) => {
    try {
      return await mentorService.applyMentor(payload, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


export const fetchMyMentorProfile = createAsyncThunk(
  "mentorship/fetchMyMentorProfile",
  async (token, thunkAPI) => {
    try {
      return await mentorService.getMyMentorProfile(token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


export const updateMentorProfile = createAsyncThunk(
  "mentorship/updateMentorProfile",
  async ({ payload, token }, thunkAPI) => {
    try {
      return await mentorService.updateMentorProfile(payload, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);



/* ============================================================
   DOCUMENTS
============================================================ */

export const addVerificationDoc = createAsyncThunk(
  "mentorship/addVerificationDoc",
  async ({ payload, token }, thunkAPI) => {
    try {
      return await mentorService.addVerificationDoc(payload, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


export const removeVerificationDoc = createAsyncThunk(
  "mentorship/removeVerificationDoc",
  async ({ index, token }, thunkAPI) => {
    try {
      return await mentorService.removeVerificationDoc(index, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);



/* ============================================================
   STORIES
============================================================ */

export const addStory = createAsyncThunk(
  "mentorship/addStory",
  async ({ payload, token }, thunkAPI) => {
    try {
      return await mentorService.addStory(payload, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


export const updateStory = createAsyncThunk(
  "mentorship/updateStory",
  async ({ storyId, payload, token }, thunkAPI) => {
    try {
      return await mentorService.updateStory(storyId, payload, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


export const deleteStory = createAsyncThunk(
  "mentorship/deleteStory",
  async ({ storyId, token }, thunkAPI) => {
    try {
      return await mentorService.deleteStory(storyId, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);



/* ============================================================
   ADMIN
============================================================ */

export const fetchPendingMentors = createAsyncThunk(
  "mentorship/fetchPendingMentors",
  async (token, thunkAPI) => {
    try {
      return await mentorService.getPendingMentors(token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


export const approveMentor = createAsyncThunk(
  "mentorship/approveMentor",
  async ({ mentorId, token }, thunkAPI) => {
    try {
      return await mentorService.approveMentor(mentorId, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


export const rejectMentor = createAsyncThunk(
  "mentorship/rejectMentor",
  async ({ mentorId, reason, token }, thunkAPI) => {
    try {
      return await mentorService.rejectMentor(mentorId, reason, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);



/* ============================================================
   SLICE
============================================================ */

const mentorshipSlice = createSlice({
  name: "mentorship",
  initialState,

  reducers: {
    clearMentorError: (state) => {
      state.error = null;
    },

    clearSelectedMentor: (state) => {
      state.selectedMentor = null;
      state.stories = [];
    },
  },

  extraReducers: (builder) => {

    const setLoading = (state) => {
      state.loading = true;
      state.error = null;
    };

    const setError = (state, action) => {
      state.loading = false;
      state.error = action.payload;
    };



    /* ---------------- mentors ---------------- */
    builder
      .addCase(fetchMentors.pending, setLoading)
      .addCase(fetchMentors.fulfilled, (state, action) => {
        state.loading = false;
        state.mentors = action.payload;
      })
      .addCase(fetchMentors.rejected, setError);



    /* ---------------- mentor details ---------------- */
    builder
      .addCase(fetchMentorById.fulfilled, (state, action) => {
        state.selectedMentor = action.payload;
      });



    /* ---------------- stories ---------------- */
    builder
      .addCase(fetchMentorStories.fulfilled, (state, action) => {
        state.stories = action.payload;
      })
      .addCase(addStory.fulfilled, (state, action) => {
        state.stories = action.payload;
      })
      .addCase(deleteStory.fulfilled, (state, action) => {
        state.stories = state.stories.filter(
          (s) => s._id !== action.meta.arg.storyId
        );
      });



    /* ---------------- profile ---------------- */
    builder
      .addCase(fetchMyMentorProfile.fulfilled, (state, action) => {
        state.myProfile = action.payload;
      })
      .addCase(updateMentorProfile.fulfilled, (state, action) => {
        state.myProfile = action.payload;
      });



    /* ---------------- admin ---------------- */
    builder
      .addCase(fetchPendingMentors.fulfilled, (state, action) => {
        state.pendingMentors = action.payload;
      });
  },
});



/* ============================================================
   EXPORTS
============================================================ */

export const {
  clearMentorError,
  clearSelectedMentor,
} = mentorshipSlice.actions;

export default mentorshipSlice.reducer;
