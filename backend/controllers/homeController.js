const fetchHome = (req, res) => {
  console.log("Hello")
  return res.send('Event Management System');
}

module.exports = {
  fetchHome
}