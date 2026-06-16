function Topbar() {
    const user = JSON.parse(localStorage.getItem("user") || "null");
  
    return (
      <div className="topbar">
        <div>Dashboard</div>
  
        <div className="topbar-user">
          <span>{user?.name}</span>
        </div>
      </div>
    );
  }
  
  export default Topbar;