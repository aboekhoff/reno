
RT["reno::app"] = function() {
    var local_1_0, local_1_1, local_1_2, local_1_3, local_1_4, local_1_5, local_1_6;
    RT["reno::prn"]("and we are live");
    local_1_1 = RT["reno::window"]["document"];
    local_1_2 = local_1_1["body"];
    local_1_3 = local_1_1["createElement"]("canvas");
    local_1_4 = local_1_3["getContext"]("2d");
    local_1_5 = 640;
    local_1_6 = 480;
    local_1_2["appendChild"](local_1_3);
    local_1_3["width"] = local_1_5;
    local_1_3["height"] = local_1_6;
    local_1_4["fillStyle"] = "rgb(100, 20, 20)";
    local_1_0 = local_1_4["fillRect"](0, 0, local_1_5, local_1_6);
    return local_1_0;
};

RT["reno::-main"] = function() {
    var local_1_0;
    RT["reno::window"]["onload"] = RT["reno::app"];
    local_1_0 = RT["reno::window"]["onload"];
    return local_1_0;
};
RT["reno::-main"]()