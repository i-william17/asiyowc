// asiyowc/components/legacy/LegacyModals.js
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Image,
    Platform
} from 'react-native';
import {
    MessageCircle,
    X,
    Send,
    ThumbsUp,
    Trash2,
    ChevronDown,
    MapPin,
    Clock,
    CheckCircle,
    Edit,
    Info
} from "lucide-react-native";

import tw from "../../utils/tw";
import Animated, { FadeInDown } from "react-native-reanimated";

const timeAgo = (date) => {
    if (!date) return "";

    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);

    const intervals = [
        { label: "year", seconds: 31536000 },
        { label: "month", seconds: 2592000 },
        { label: "week", seconds: 604800 },
        { label: "day", seconds: 86400 },
        { label: "hour", seconds: 3600 },
        { label: "minute", seconds: 60 },
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
        }
    }

    return "just now";
};

// ========== Comments Modal Component ==========
export const CommentsModal = React.memo(({
    visible,
    onClose,
    comments,
    onAddComment,
    onLikeComment,
    onDeleteComment,
    currentUserId,
    tributeId
}) => {
    const [commentText, setCommentText] = useState('');
    const [visibleComments, setVisibleComments] = useState(5);
    const commentInputRef = useRef(null);

    const handleSubmitComment = () => {
        if (commentText.trim()) {
            onAddComment(tributeId, commentText);
            setCommentText('');
        }
    };

    const handleLoadMore = () => {
        setVisibleComments(prev => prev + 5);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={tw`flex-1 bg-black/50`}>
                <View style={[tw`bg-white rounded-t-3xl mt-20 flex-1`, Platform.OS === 'ios' && tw`pt-6`]}>
                    {/* Modal Header */}
                    <View style={tw`flex-row justify-between items-center px-6 py-4 border-b border-gray-200`}>
                        <Text style={[tw`text-purple-900 text-xl`, { fontFamily: 'Poppins-Bold' }]}>
                            Comments ({comments.length})
                        </Text>
                        <TouchableOpacity onPress={onClose} style={tw`p-2`}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Comments List */}
                    <ScrollView style={tw`flex-1 px-6 py-4`}>
                        {comments.length === 0 ? (
                            <View style={tw`items-center justify-center py-12`}>
                                <MessageCircle size={48} color="#A78BFA" />
                                <Text style={[tw`text-gray-500 text-lg mt-4`, { fontFamily: 'Poppins-SemiBold' }]}>
                                    No comments yet
                                </Text>
                                <Text style={[tw`text-gray-400 text-center mt-2`, { fontFamily: 'Poppins-Regular' }]}>
                                    Be the first to share your thoughts
                                </Text>
                            </View>
                        ) : (
                            <>
                                {comments.slice(0, visibleComments).map((comment) => (
                                    <View key={comment._id} style={tw`flex-row mb-4`}>
                                        {/* Avatar */}
                                        {comment.user?.profile?.avatar?.url ? (
                                            <Image
                                                source={{ uri: comment.user.profile.avatar.url }}
                                                style={tw`w-10 h-10 rounded-full mr-3`}
                                            />
                                        ) : (
                                            <View style={tw`w-10 h-10 rounded-full bg-purple-600 
                                                        items-center justify-center mr-3`}>
                                                <Text style={[tw`text-white text-sm`, { fontFamily: 'Poppins-Bold' }]}>
                                                    {comment.user?.profile?.fullName?.[0]?.toUpperCase() || "?"}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={tw`flex-1 bg-gray-50 rounded-xl p-3`}>
                                            <View style={tw`flex-row justify-between items-start`}>
                                                <Text style={[tw`text-purple-900 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                                                    {comment.user?.profile?.fullName || "Anonymous"}
                                                </Text>
                                                <View style={tw`flex-row items-center`}>
                                                    {/* Like Button */}
                                                    <TouchableOpacity
                                                        onPress={() => onLikeComment(tributeId, comment._id)}
                                                        style={tw`flex-row items-center mr-4`}
                                                    >
                                                        <ThumbsUp
                                                            size={14}
                                                            color={comment.likedBy?.includes(currentUserId)
                                                                ? "#7C3AED"
                                                                : "#9CA3AF"}
                                                        />
                                                        <Text style={[tw`text-xs ml-1`, { fontFamily: 'Poppins-Regular' }]}>
                                                            {comment.likes || 0}
                                                        </Text>
                                                    </TouchableOpacity>

                                                    {/* Delete Button (Owner Only) */}
                                                    {comment.user?._id === currentUserId && (
                                                        <TouchableOpacity
                                                            onPress={() => onDeleteComment(tributeId, comment._id)}
                                                        >
                                                            <Trash2 size={14} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </View>

                                            <Text style={[tw`text-gray-700 text-sm mt-2`, { fontFamily: 'Poppins-Regular' }]}>
                                                {comment.message}
                                            </Text>

                                            <Text style={[tw`text-gray-400 text-xs mt-2`, { fontFamily: 'Poppins-Regular' }]}>
                                                {new Date(comment.createdAt).toLocaleString()}
                                            </Text>
                                        </View>
                                    </View>
                                ))}

                                {/* Load More Button */}
                                {visibleComments < comments.length && (
                                    <TouchableOpacity
                                        onPress={handleLoadMore}
                                        style={tw`flex-row items-center justify-center py-3 
                                                border-t border-gray-200 mt-4`}
                                    >
                                        <ChevronDown size={16} color="#7C3AED" />
                                        <Text style={[tw`text-purple-600 ml-2`, { fontFamily: 'Poppins-SemiBold' }]}>
                                            See More Comments
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {/* Add Comment Input */}
                    <View style={tw`border-t border-gray-200 px-6 py-4`}>
                        <View style={tw`flex-row items-center`}>
                            <TextInput
                                ref={commentInputRef}
                                value={commentText}
                                onChangeText={setCommentText}
                                placeholder="Write a comment..."
                                placeholderTextColor="#9CA3AF"
                                style={[
                                    tw`flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm`,
                                    { fontFamily: 'Poppins-Regular' }
                                ]}
                                multiline
                            />
                            <TouchableOpacity
                                onPress={handleSubmitComment}
                                disabled={!commentText.trim()}
                                style={tw`ml-3 bg-purple-600 w-10 h-10 rounded-full 
                                        items-center justify-center`}
                            >
                                <Send size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

// ========== Tribute Modal ==========
export const TributeModal = React.memo(({
    modalVisible,
    setModalVisible,
    newTribute,
    setNewTribute,
    handleSubmitTribute,
    lastSubmitted,
    user,
    editingTribute
}) => {
    const WORD_LIMIT = 500;

    const wordCount =
        newTribute?.message?.trim().split(/\s+/).filter(Boolean).length || 0;

    const isOverLimit = wordCount > WORD_LIMIT;
    const isRateLimited = lastSubmitted && Date.now() - lastSubmitted < 60000;

    return (
        <Modal
            animationType="slide"
            transparent
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={tw`flex-1 bg-black/50 justify-end`}>
                <View style={tw`bg-white rounded-t-3xl p-6 max-h-[85%]`}>
                    {/* Header */}
                    <View style={tw`flex-row justify-between items-center mb-6`}>
                        <Text style={[tw`text-purple-900 text-xl`, { fontFamily: "Poppins-Bold" }]}>
                            {editingTribute ? "Edit Tribute" : "Share Your Tribute"}
                        </Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* User */}
                    <Text style={[tw`text-purple-600 mb-3`, { fontFamily: "Poppins-Regular" }]}>
                        {user?.profile?.fullName}
                    </Text>

                    {/* Input */}
                    <TextInput
                        value={newTribute.message}
                        onChangeText={(text) => {
                            const words = text.trim().split(/\s+/).filter(Boolean);
                            if (words.length <= WORD_LIMIT) {
                                setNewTribute({ message: text });
                            }
                        }}
                        placeholder="Share your story about Mama Phoebe Asiyo..."
                        multiline
                        textAlignVertical="top"
                        style={[
                            tw`bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-gray-800`,
                            { minHeight: 220, fontFamily: "Poppins-Regular" }
                        ]}
                    />

                    {/* Word count */}
                    <Text
                        style={[
                            tw`text-xs mt-2 text-right`,
                            isOverLimit ? tw`text-red-500` : tw`text-gray-400`
                        ]}
                    >
                        {wordCount}/{WORD_LIMIT} words
                    </Text>

                    {/* Rate limit warning */}
                    {isRateLimited && (
                        <Text style={[tw`text-amber-600 text-sm mt-3 text-center`, { fontFamily: "Poppins-Regular" }]}>
                            Please wait before submitting another tribute.
                        </Text>
                    )}

                    <View style={tw`flex-row items-start bg-purple-50 border border-purple-200 
                rounded-xl p-3 mb-4`}>
                        <Info size={16} color="#7C3AED" style={tw`mt-0.5 mr-2`} />
                        <Text
                            style={[
                                tw`text-purple-700 text-xs flex-1`,
                                { fontFamily: "Poppins-Regular" },
                            ]}
                        >
                            After submission, it youll be able to submit another after <Text style={{ fontFamily: "Poppins-SemiBold" }}>60 seconds</Text>. You can submit a maximum of <Text style={{ fontFamily: "Poppins-SemiBold" }}>3 tributes</Text>.
                            You can edit or delete your existing tributes.
                        </Text>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        disabled={!newTribute.message?.trim() || isOverLimit || isRateLimited}
                        onPress={handleSubmitTribute}
                        style={[
                            tw`mt-6 py-4 rounded-xl flex-row items-center justify-center`,
                            (!newTribute.message?.trim() || isOverLimit)
                                ? tw`bg-gray-300`
                                : tw`bg-purple-600`
                        ]}
                    >
                        <Send size={20} color="#FFF" />
                        <Text style={[tw`text-white ml-2`, { fontFamily: "Poppins-SemiBold" }]}>
                            {editingTribute ? "Update Tribute" : "Submit Tribute"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
});

// ========== Tribute Item Component ==========
export const TributeItem = React.memo(({
  tribute,
  currentUserId,
  onLike,
  onEditSave,
  onDelete,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onOpenComments
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(tribute.message);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const WORD_LIMIT = 500;
  const MAX_CHARS = 100;
  const [expanded, setExpanded] = useState(false);

  const isLong = tribute.message.length > MAX_CHARS;

  const displayMessage = expanded
    ? tribute.message
    : tribute.message.slice(0, MAX_CHARS).trim();

  const editWordCount = draft
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  React.useEffect(() => {
    setDraft(tribute.message);
    setExpanded(false);
  }, [tribute.message]);

  return (
    <Animated.View
      entering={FadeInDown.delay(Number(tribute._id?.slice(-2)) || 0)}
      style={[
        tw`mb-5 rounded-3xl overflow-hidden`,
        {
          backgroundColor: "rgba(255,255,255,0.9)",
          borderWidth: 1,
          borderColor: "rgba(212,175,55,0.25)",
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        },
      ]}
    >
      {/* subtle glass highlight */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 100,
          backgroundColor: "rgba(255,255,255,0.25)",
        }}
      />

      <View style={tw`p-5`}>
        {/* Header */}
        <View style={tw`flex-row items-center mb-4`}>
          {/* Avatar */}
          {tribute.user?.profile?.avatar?.url ? (
            <Image
              source={{ uri: tribute.user.profile.avatar.url }}
              style={tw`w-12 h-12 rounded-full mr-4`}
            />
          ) : (
            <View
              style={[
                tw`items-center justify-center mr-4`,
                {
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "rgba(124,58,237,0.9)",
                  borderWidth: 1,
                  borderColor: "rgba(212,175,55,0.6)",
                },
              ]}
            >
              <Text style={[tw`text-white text-lg`, { fontFamily: "Poppins-Bold" }]}>
                {tribute.user?.profile?.fullName?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
          )}

          {/* User Info */}
          <View style={tw`flex-1`}>
            <Text style={[tw`text-purple-900 text-base`, { fontFamily: "Poppins-SemiBold" }]}>
              {tribute.user?.profile?.fullName}
            </Text>

            <View style={tw`flex-row items-center mt-1`}>
              {(tribute.user?.profile?.location?.city ||
                tribute.user?.profile?.location?.country) && (
                <View style={tw`flex-row items-center mr-4`}>
                  <MapPin size={12} color="#9CA3AF" />
                  <Text style={[tw`text-gray-500 text-xs ml-1`, { fontFamily: "Poppins-Regular" }]}>
                    {[
                      tribute.user.profile.location.city,
                      tribute.user.profile.location.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                </View>
              )}
            </View>

            <View style={tw`flex-row items-center`}>
              <Clock size={12} color="#9CA3AF" />
              <Text style={[tw`text-gray-400 text-xs ml-1`, { fontFamily: "Poppins-Regular" }]}>
                {timeAgo(tribute.createdAt)}
              </Text>

              {tribute.updatedAt && tribute.updatedAt !== tribute.createdAt && (
                <View style={tw`flex-row items-center ml-4`}>
                  <Edit size={12} color="#9CA3AF" />
                  <Text style={[tw`text-gray-400 text-xs ml-1`, { fontFamily: "Poppins-Regular" }]}>
                    Edited {timeAgo(tribute.updatedAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Message / Edit */}
        {isEditing ? (
          <>
            <TextInput
              style={[
                tw`rounded-2xl px-4 py-4 text-gray-800`,
                {
                  backgroundColor: "rgba(243,244,246,0.9)",
                  borderWidth: 1,
                  borderColor: "rgba(209,213,219,0.8)",
                  fontFamily: "Poppins-Regular",
                  minHeight: 180,
                  maxHeight: 300,
                },
              ]}
              value={draft}
              onChangeText={(text) => {
                const words = text.trim().split(/\s+/).filter(Boolean);
                if (words.length <= WORD_LIMIT) {
                  setDraft(text);
                }
              }}
              multiline
              textAlignVertical="top"
            />

            <Text
              style={[
                tw`text-xs mt-2 text-right`,
                editWordCount >= WORD_LIMIT ? tw`text-red-500` : tw`text-gray-400`,
                { fontFamily: "Poppins-Regular" },
              ]}
            >
              {editWordCount}/{WORD_LIMIT} words
            </Text>
          </>
        ) : (
          <View style={tw`mb-4`}>
            <Text
              style={[
                tw`text-gray-700 leading-7`,
                {
                  fontFamily: "Poppins-Italic",
                  fontSize: 15,
                },
              ]}
            >
              “{displayMessage}{!expanded && isLong ? "…" : ""}”
            </Text>

            {isLong && (
              <TouchableOpacity
                onPress={() => setExpanded((prev) => !prev)}
                activeOpacity={0.7}
                style={tw`mt-2`}
              >
                <Text style={[tw`text-purple-600 text-sm`, { fontFamily: "Poppins-SemiBold" }]}>
                  {expanded ? "Show less" : "Show more"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={tw`flex-row items-center justify-between mt-2`}>
          {/* Left */}
          <View style={tw`flex-row items-center`}>
            {/* Like */}
            <TouchableOpacity
              onPress={() => onLike(tribute._id)}
              style={tw`flex-row items-center mr-6`}
            >
              <View
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center mr-2`,
                  {
                    backgroundColor: tribute.likedBy?.includes(currentUserId)
                      ? "rgba(124,58,237,0.15)"
                      : "rgba(243,244,246,1)",
                  },
                ]}
              >
                <ThumbsUp
                  size={20}
                  fill={tribute.likedBy?.includes(currentUserId) ? "#7C3AED" : "none"}
                  color={tribute.likedBy?.includes(currentUserId) ? "#7C3AED" : "#6B7280"}
                />
              </View>

              <Text
                style={[
                  tw`text-base`,
                  tribute.likedBy?.includes(currentUserId)
                    ? tw`text-purple-600`
                    : tw`text-gray-600`,
                  { fontFamily: "Poppins-SemiBold" },
                ]}
              >
                {tribute.likes || 0}
              </Text>
            </TouchableOpacity>

            {/* Comment */}
            <TouchableOpacity
              onPress={() => setCommentsModalVisible(true)}
              style={tw`flex-row items-center`}
            >
              <View
                style={[
                  tw`w-10 h-10 rounded-full items-center justify-center mr-2`,
                  { backgroundColor: "rgba(243,244,246,1)" },
                ]}
              >
                <MessageCircle size={20} color="#6B7280" />
              </View>

              <Text style={[tw`text-gray-600 text-base`, { fontFamily: "Poppins-SemiBold" }]}>
                {tribute.comments?.length || 0}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Right (Owner actions) */}
          {tribute.user?._id === currentUserId && (
            <View style={tw`flex-row`}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    disabled={editWordCount > WORD_LIMIT}
                    onPress={() => {
                      onEditSave(tribute._id, draft);
                      setIsEditing(false);
                    }}
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                      {
                        backgroundColor:
                          editWordCount > WORD_LIMIT
                            ? "rgba(229,231,235,1)"
                            : "rgba(16,185,129,0.15)",
                      },
                    ]}
                  >
                    <CheckCircle
                      size={20}
                      color={editWordCount > WORD_LIMIT ? "#9CA3AF" : "#10B981"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsEditing(false);
                      setDraft(tribute.message);
                    }}
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center`,
                      { backgroundColor: "rgba(243,244,246,1)" },
                    ]}
                  >
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                      { backgroundColor: "rgba(124,58,237,0.15)" },
                    ]}
                  >
                    <Edit size={20} color="#7C3AED" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => onDelete(tribute._id)}
                    style={[
                      tw`w-10 h-10 rounded-full items-center justify-center`,
                      { backgroundColor: "rgba(239,68,68,0.15)" },
                    ]}
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsModalVisible}
        onClose={() => setCommentsModalVisible(false)}
        comments={tribute.comments || []}
        onAddComment={onAddComment}
        onLikeComment={onLikeComment}
        onDeleteComment={onDeleteComment}
        currentUserId={currentUserId}
        tributeId={tribute._id}
      />
    </Animated.View>
  );
});
