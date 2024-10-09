import "./chatcss/List.css";
import ChatList from "./ChatList";
import UserInfo from "./Userinfo";

const List = () => {
    return (
        <div className='list'>List
        <UserInfo/>
        <ChatList/>
        </div>
    )
}

export default List;