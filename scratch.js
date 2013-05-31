
RT["reno::app"] = function() {
    var local_1_0;
    RT["reno::prn"]("and we are live");
    RT["reno::document"] = RT["reno::window"]["document"];
    RT["reno::body"] = RT["reno::document"]["body"];
    RT["reno::canvas"] = RT["reno::document"]["createElement"]("canvas");
    RT["reno::body"]["appendChild"](RT["reno::canvas"]);
    RT["reno::WIDTH"] = 640;
    RT["reno::HEIGHT"] = 480;
    RT["reno::canvas"]["width"] = RT["reno::WIDTH"];
    RT["reno::canvas"]["height"] = RT["reno::HEIGHT"];
    RT["reno::ctx"] = RT["reno::canvas"]["getContext"]("2d");
    RT["reno::ctx"]["fillStyle"] = "rgb(100, 20, 20)";
    local_1_0 = RT["reno::ctx"]["fillRect"](0, 0, RT["reno::WIDTH"], RT["reno::HEIGHT"]);
    return local_1_0;
};

RT["reno::-main"] = function() {
    var local_1_0;
    RT["reno::window"]["onload"] = RT["reno::app"];
    local_1_0 = RT["reno::window"]["onload"];
    return local_1_0;
};
RT["reno::-main"]()