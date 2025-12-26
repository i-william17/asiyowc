import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { postService } from '../../services/post';

const EditPostModal = ({ visible, post, onClose }) => {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setText(post.content?.text || '');
    }
  }, [post]);

  const handleSave = async () => {
    if (!text.trim()) return;

    setSaving(true);

    try {
      await postService.updatePost(post._id, {
        content: { text }
      });
      onClose(true); // success
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
        {/* HEADER */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold' }}>
            Edit Post
          </Text>
          <TouchableOpacity onPress={() => onClose(false)}>
            <Ionicons name="close" size={24} />
          </TouchableOpacity>
        </View>

        {/* INPUT */}
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Edit your post…"
          style={{
            marginTop: 20,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 14,
            padding: 14,
            minHeight: 140,
            textAlignVertical: 'top'
          }}
        />

        {/* SAVE */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            marginTop: 30,
            backgroundColor: '#6A1B9A',
            padding: 14,
            borderRadius: 16,
            alignItems: 'center'
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontFamily: 'Poppins-SemiBold' }}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default EditPostModal;
