module.exports = function VideoContainer(dom) {

	var videoNode = dom.querySelector("object");
	videoNode.parentElement.removeChild(videoNode);

	dom.addEventListener("click", function () {
		dom.style.display = "none";
		dom.removeChild(dom.querySelector("object"));
	}, false);

	function createVideo(url, width, height) {
		var newVideo = videoNode.cloneNode(true);
		var embed = null;

		newVideo.width = width;
		newVideo.height = height;

		newVideo.querySelector("[name=movie]").value = url;
		embed = newVideo.querySelector("embed");

		embed.width = width;
		embed.height = height;
		embed.src = url;

		embed.parentElement.style["margin-left"] = "-" + Math.floor(width / 2) + "px";
		embed.parentElement.style["margin-top"] = "-" + Math.floor(height / 2) + "px";

		return newVideo;
	}

	this.show = function show(video) {
		dom.style.display = "block";
		dom.appendChild(createVideo(video.source, video.width, video.height));
	};
};