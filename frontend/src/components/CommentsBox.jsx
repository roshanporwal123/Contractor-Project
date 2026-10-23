import { useEffect, useState } from "react";
import { chatApi } from "../api/chatApi";
import { useAuth } from "../context/AuthContext"; // adjust karo

export default function CommentsBox({ parentType, parentId }) {
  const { user } = useAuth();
  const myId = user?._id || user?.id;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  const load = async () => {
    const { data } = await chatApi.getComments(parentType, parentId);
    setComments(data.comments);
  };

  useEffect(() => {
    load();
  }, [parentType, parentId]);

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const { data } = await chatApi.addComment(parentType, parentId, text);
    setComments((prev) => [...prev, data.comment]);
    setText("");
  };

  const remove = async (id) => {
    if (!window.confirm("Comment delete karna hai?")) return;
    await chatApi.deleteComment(id);
    setComments((prev) => prev.filter((c) => c._id !== id));
  };

  return (
    <div className="comments-box">
      <h4>Comments ({comments.length})</h4>
      {comments.map((c) => (
        <div key={c._id} className="comment">
          <div className="comment-head">
            <b>{c.author?.name}</b>
            <small>{new Date(c.createdAt).toLocaleString()}</small>
            {(c.author?._id === myId || user?.role === "admin") && (
              <button onClick={() => remove(c._id)}>🗑</button>
            )}
          </div>
          <div>{c.text}</div>
        </div>
      ))}
      <form onSubmit={add} className="comment-form">
        <input
          placeholder="Comment likho..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary">Post</button>
      </form>
    </div>
  );
}